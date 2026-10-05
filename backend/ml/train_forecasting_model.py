import os
import sys
import json
import math
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, mean_absolute_percentage_error

# Day of week mapping
DOW_MAP = {
    'Monday': 0, 'Tuesday': 1, 'Wednesday': 2, 'Thursday': 3,
    'Friday': 4, 'Saturday': 5, 'Sunday': 6
}

def load_data(csv_path):
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"CSV file not found at {csv_path}")
    
    df = pd.read_csv(csv_path)
    df.columns = [c.strip() for c in df.columns]
    
    # Normalize date
    df['date'] = pd.to_datetime(df['date'].astype(str).str.split(' ').str[0])
    df = df.sort_values(by=['medicine_id', 'date']).reset_index(drop=True)
    return df

def prepare_features(df):
    """
    For each medicine, create:
    - lag_1 = previous day's units sold
    - lag_7 = units sold 7 days ago
    - lag_30 = units sold 30 days ago
    Along with sales_7d_avg, sales_30d_avg, month, day_of_week, is_weekend
    Remove rows where required lag values are unavailable.
    """
    feature_dfs = []
    
    for med_id, med_df in df.groupby('medicine_id'):
        med_df = med_df.sort_values(by='date').copy()
        med_df['lag_1'] = med_df['units_sold'].shift(1)
        med_df['lag_7'] = med_df['units_sold'].shift(7)
        med_df['lag_30'] = med_df['units_sold'].shift(30)
        
        # Day of week integer
        if med_df['day_of_week'].dtype == object:
            med_df['dow_num'] = med_df['day_of_week'].map(DOW_MAP).fillna(med_df['date'].dt.dayofweek)
        else:
            med_df['dow_num'] = med_df['date'].dt.dayofweek
            
        feature_dfs.append(med_df)
        
    full_df = pd.concat(feature_dfs, ignore_index=True)
    
    # Drop rows where lag values are unavailable (first 30 days of each medicine)
    clean_df = full_df.dropna(subset=['lag_1', 'lag_7', 'lag_30']).reset_index(drop=True)
    return clean_df

def train_and_evaluate(df):
    feature_cols = [
        'lag_1', 'lag_7', 'lag_30',
        'sales_7d_avg', 'sales_30d_avg',
        'month', 'dow_num', 'is_weekend'
    ]
    target_col = 'units_sold'
    
    # Chronological sort across dataset
    df = df.sort_values(by='date').reset_index(drop=True)
    n = len(df)
    
    train_end = int(n * 0.70)
    val_end = int(n * 0.85)
    
    train_df = df.iloc[:train_end]
    val_df = df.iloc[train_end:val_end]
    test_df = df.iloc[val_end:]
    
    X_train = train_df[feature_cols]
    y_train = train_df[target_col]
    
    X_val = val_df[feature_cols]
    y_val = val_df[target_col]
    
    X_test = test_df[feature_cols]
    y_test = test_df[target_col]
    
    # Train GradientBoostingRegressor
    model = GradientBoostingRegressor(
        n_estimators=100,
        learning_rate=0.08,
        max_depth=4,
        random_state=42
    )
    model.fit(X_train, y_train)
    
    # Predictions
    y_pred_test = model.predict(X_test)
    y_pred_test = np.clip(y_pred_test, 0, None) # Demands cannot be negative
    
    # Evaluation metrics
    mae = float(mean_absolute_error(y_test, y_pred_test))
    rmse = float(np.sqrt(mean_squared_error(y_test, y_pred_test)))
    
    # Safe MAPE calculation
    mask = y_test > 0
    mape = float(np.mean(np.abs((y_test[mask] - y_pred_test[mask]) / y_test[mask])) * 100)
    
    # Baseline comparison: Simple moving average (sales_7d_avg)
    y_baseline = test_df['sales_7d_avg'].values
    base_mae = float(mean_absolute_error(y_test, y_baseline))
    base_rmse = float(np.sqrt(mean_squared_error(y_test, y_baseline)))
    base_mape = float(np.mean(np.abs((y_test[mask] - y_baseline[mask]) / y_test[mask])) * 100)
    
    # Per-medicine models and forecast generation
    medicines_summary = {}
    
    for med_id, med_df in df.groupby('medicine_id'):
        med_name = med_df['medicine_name'].iloc[0]
        med_sorted = med_df.sort_values(by='date').reset_index(drop=True)
        
        # Fit per-medicine GradientBoostingRegressor for tailored predictions
        m_model = GradientBoostingRegressor(
            n_estimators=80,
            learning_rate=0.08,
            max_depth=3,
            random_state=42
        )
        m_model.fit(med_sorted[feature_cols], med_sorted[target_col])
        
        # Generate recursive multi-step forecasts for 7, 30, and 90 days
        last_row = med_sorted.iloc[-1].copy()
        
        # We simulate future days
        sim_units = list(med_sorted['units_sold'].values)
        sim_dates = list(med_sorted['date'].values)
        last_date = pd.to_datetime(sim_dates[-1])
        
        daily_forecasts = []
        
        for step in range(1, 91):
            future_date = last_date + pd.Timedelta(days=step)
            f_month = future_date.month
            f_dow = future_date.dayofweek
            f_weekend = 1 if f_dow in [5, 6] else 0
            
            f_lag_1 = sim_units[-1]
            f_lag_7 = sim_units[-7] if len(sim_units) >= 7 else sim_units[-1]
            f_lag_30 = sim_units[-30] if len(sim_units) >= 30 else sim_units[0]
            f_7d_avg = float(np.mean(sim_units[-7:]))
            f_30d_avg = float(np.mean(sim_units[-30:]))
            
            x_future = pd.DataFrame([{
                'lag_1': f_lag_1,
                'lag_7': f_lag_7,
                'lag_30': f_lag_30,
                'sales_7d_avg': f_7d_avg,
                'sales_30d_avg': f_30d_avg,
                'month': f_month,
                'dow_num': f_dow,
                'is_weekend': f_weekend
            }])
            
            pred_demand = float(m_model.predict(x_future)[0])
            pred_demand = max(0.0, pred_demand)
            sim_units.append(pred_demand)
            
            daily_forecasts.append({
                'day': step,
                'date': future_date.strftime('%Y-%m-%d'),
                'predicted_units': round(pred_demand, 1)
            })
            
        forecast_7d = round(sum(d['predicted_units'] for d in daily_forecasts[:7]))
        forecast_30d = round(sum(d['predicted_units'] for d in daily_forecasts[:30]))
        forecast_90d = round(sum(d['predicted_units'] for d in daily_forecasts[:90]))
        
        # Historical slice for visualization (last 30 days)
        recent_history = [
            {
                'date': r['date'].strftime('%Y-%m-%d'),
                'units_sold': int(r['units_sold']),
                'sales_7d_avg': round(float(r['sales_7d_avg']), 1)
            }
            for _, r in med_sorted.iloc[-30:].iterrows()
        ]
        
        # Lead time and safety stock
        lead_time = int(med_sorted['supplier_lead_time_days'].iloc[-1])
        daily_avg = float(np.mean(med_sorted['units_sold'].iloc[-30:]))
        daily_std = float(np.std(med_sorted['units_sold'].iloc[-30:]))
        # Safety stock = Z * std * sqrt(lead_time), with Z=1.65 (95% service level)
        safety_stock = int(math.ceil(1.65 * (daily_std or 2.0) * math.sqrt(lead_time)))
        reorder_level = int(med_sorted['reorder_level'].iloc[-1])
        
        medicines_summary[med_id] = {
            'medicine_id': med_id,
            'medicine_name': med_name,
            'lead_time_days': lead_time,
            'reorder_level': reorder_level,
            'safety_stock': safety_stock,
            'daily_average_sales': round(daily_avg, 2),
            'forecast_7d': forecast_7d,
            'forecast_30d': forecast_30d,
            'forecast_90d': forecast_90d,
            'recent_history': recent_history,
            'daily_forecasts_30d': daily_forecasts[:30],
            'daily_forecasts_90d': daily_forecasts
        }
        
    results = {
        'model_name': 'Scikit-learn GradientBoostingRegressor',
        'features_used': feature_cols,
        'dataset': {
            'name': 'Historical Synthetic Sales Data (6 months)',
            'total_raw_records': len(df) + 30 * 30, # including dropped initial lag rows
            'training_records': len(train_df),
            'validation_records': len(val_df),
            'testing_records': len(test_df),
            'total_medicines': len(medicines_summary)
        },
        'metrics': {
            'mae': round(mae, 3),
            'rmse': round(rmse, 3),
            'mape_percent': round(mape, 2),
            'baseline_moving_avg': {
                'name': '7-Day Simple Moving Average Baseline',
                'mae': round(base_mae, 3),
                'rmse': round(base_rmse, 3),
                'mape_percent': round(base_mape, 2)
            },
            'improvement_over_baseline': {
                'mae_reduction_percent': round(((base_mae - mae) / base_mae) * 100, 2),
                'rmse_reduction_percent': round(((base_rmse - rmse) / base_rmse) * 100, 2)
            }
        },
        'medicines': medicines_summary
    }
    
    return results

if __name__ == '__main__':
    csv_paths = [
        'pharmasync_forecasting_dataset_6_months.csv',
        '../pharmasync_forecasting_dataset_6_months.csv',
        'c:/Users/ketha/smart-pharmacy/pharmasync_forecasting_dataset_6_months.csv',
        'c:/Users/ketha/smart-pharmacy/backend/pharmasync_forecasting_dataset_6_months.csv'
    ]
    csv_path = None
    for p in csv_paths:
        if os.path.exists(p):
            csv_path = p
            break
            
    if not csv_path:
        print(json.dumps({'error': 'CSV file not found'}))
        sys.exit(1)
        
    df = load_data(csv_path)
    clean_df = prepare_features(df)
    results = train_and_evaluate(clean_df)
    
    out_dir = os.path.dirname(os.path.abspath(__file__))
    out_file = os.path.join(out_dir, 'forecast_results.json')
    with open(out_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2)
        
    print(f"SUCCESS: Model trained and evaluated. Results written to {out_file}")
    print(json.dumps({
        'status': 'success',
        'model': results['model_name'],
        'mae': results['metrics']['mae'],
        'rmse': results['metrics']['rmse'],
        'mape': results['metrics']['mape_percent'],
        'baseline_mae': results['metrics']['baseline_moving_avg']['mae'],
        'baseline_rmse': results['metrics']['baseline_moving_avg']['rmse'],
        'baseline_mape': results['metrics']['baseline_moving_avg']['mape_percent'],
        'medicines_count': len(results['medicines'])
    }, indent=2))
