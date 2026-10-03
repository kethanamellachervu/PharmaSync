import { Router } from 'express';
import healthRoutes from './healthRoutes.js';
import inventoryRoutes from './inventoryRoutes.js';
import salesRoutes from './salesRoutes.js';
import settingsRoutes from './settingsRoutes.js';
import supplierRoutes from './supplierRoutes.js';
import purchaseRoutes from './purchaseRoutes.js';

const apiRouter = Router();

// Mount API routes
apiRouter.use('/', healthRoutes);
apiRouter.use('/inventory', inventoryRoutes);
apiRouter.use('/sales', salesRoutes);
apiRouter.use('/suppliers', supplierRoutes);
apiRouter.use('/purchases', purchaseRoutes);
apiRouter.use('/settings', settingsRoutes);

export default apiRouter;
