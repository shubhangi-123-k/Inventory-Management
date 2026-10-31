import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import ProductDetails from './pages/ProductDetails';
import Brands from './pages/Brands';
import Occasions from './pages/Occasions';
import Warehouses from './pages/Warehouses';
import Racking from './pages/Racking';
import Inventory from './pages/Inventory';
import Countries from './pages/Countries';
import Customs from './pages/Customs';
import Groups from './pages/Groups';
import GroupDetails from './pages/GroupDetails';
import Purchases from './pages/Purchases';
import PurchaseDetails from './pages/PurchaseDetails';
import Companies from './pages/Companies';
import Customers from './pages/Customers';
import CustomerForm from './pages/CustomerForm';
import CustomerDetails from './pages/CustomerDetails';
import Sales from './pages/Sales';
import SalesOrderForm from './pages/SalesOrderForm';
import UserManagement from './pages/UserManagement';
import Settings from './pages/Settings';
import MasterSettings from './pages/MasterSettings';
import Expenses from './pages/Expenses';
import ProductTypes from './pages/ProductTypes';
import AliasCatalog from './pages/AliasCatalog';
import ActivityLogs from './pages/ActivityLogs';
import ApprovalQueue from './pages/ApprovalQueue';
import MyApprovals from './pages/MyApprovals';
import GapAnalysis from './pages/GapAnalysis';
import VarianceSummary from './pages/VarianceSummary';
import Tasks from './pages/Tasks';
import { ToastProvider } from './context/ToastContext';
import { StockViewProvider } from './context/StockViewContext';

import PermissionRoute from './components/PermissionRoute';

const SuperAdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!isSuperAdminUser(user)) return <Navigate to="/" replace />;
  return children;
};

const isSuperAdminUser = (user) => {
  const role = String(user?.role || user?.user_role || '').toUpperCase().replace(/[^A-Z]/g, '');
  return role === 'SUPERADMIN' || user?.is_super_admin === true || user?.isSuperAdmin === true;
};

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  if (!user) return <Navigate to="/login" />;

  return children;
};

function AppRoutes() {
  const { user } = useAuth();
  const expectedPrefix = isSuperAdminUser(user) ? 'superadmin' : 'admin';
  const prefixPath = `/${expectedPrefix}`;

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<PrivateRoute><Navigate to={prefixPath} replace /></PrivateRoute>} />
      <Route
        path="/:rolePrefix"
        element={
          <PrivateRoute>
            <RolePrefixLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<PermissionRoute module="dashboard"><Dashboard /></PermissionRoute>} />
        <Route path="products" element={<PermissionRoute module="products"><Products /></PermissionRoute>} />
        <Route path="products/:id" element={<PermissionRoute module="products"><ProductDetails /></PermissionRoute>} />
        <Route path="brands" element={<PermissionRoute module="brands"><Brands /></PermissionRoute>} />
        <Route path="occasions" element={<PermissionRoute module="occasions"><Occasions /></PermissionRoute>} />
        <Route path="warehouses" element={<PermissionRoute module="warehouses"><Warehouses /></PermissionRoute>} />
        <Route path="racking" element={<PermissionRoute module="inventory"><Racking /></PermissionRoute>} />
        <Route path="rackbin" element={<PermissionRoute module="inventory"><Racking /></PermissionRoute>} />
        <Route path="inventory" element={<PermissionRoute module="inventory"><Inventory /></PermissionRoute>} />
        <Route path="inventory/gap-analysis" element={<PermissionRoute module="inventory"><GapAnalysis /></PermissionRoute>} />
        <Route path="admin/inventory/gap-analysis" element={<PermissionRoute module="inventory"><GapAnalysis /></PermissionRoute>} />
        <Route path="countries" element={<Countries />} />
        <Route path="customs" element={<Customs />} />
        <Route path="groups" element={<PermissionRoute module="groups"><Groups /></PermissionRoute>} />
        <Route path="groups/:id" element={<PermissionRoute module="groups"><GroupDetails /></PermissionRoute>} />
        <Route path="purchases" element={<PermissionRoute module="purchase_orders"><Purchases /></PermissionRoute>} />
        <Route path="purchases/:id" element={<PermissionRoute module="purchase_orders"><PurchaseDetails /></PermissionRoute>} />
        <Route path="purchases/:id/variance-summary" element={<PermissionRoute module="purchase_orders"><VarianceSummary /></PermissionRoute>} />
        <Route path="admin/purchases/:id/variance-summary" element={<PermissionRoute module="purchase_orders"><VarianceSummary /></PermissionRoute>} />
        <Route path="companies" element={<PermissionRoute module="companies"><Companies /></PermissionRoute>} />
        <Route path="customers" element={<PermissionRoute module="customers"><Customers /></PermissionRoute>} />
        <Route path="customers/new" element={<PermissionRoute module="customers" action="create"><CustomerForm /></PermissionRoute>} />
        <Route path="customers/:id/edit" element={<PermissionRoute module="customers" action="edit"><CustomerForm /></PermissionRoute>} />
        <Route path="customers/:id" element={<PermissionRoute module="customers"><CustomerDetails /></PermissionRoute>} />
        <Route path="sales" element={<PermissionRoute module="sales_orders"><Sales /></PermissionRoute>} />
        <Route path="sales/new" element={<PermissionRoute module="sales_orders" action="create"><SalesOrderForm /></PermissionRoute>} />
        <Route path="sales/:id" element={<PermissionRoute module="sales_orders"><SalesOrderForm /></PermissionRoute>} />
        <Route path="product-types" element={<PermissionRoute module="product_types"><ProductTypes /></PermissionRoute>} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="expense-master" element={<Expenses />} />
        <Route path="aliases" element={<PermissionRoute module="aliases"><AliasCatalog /></PermissionRoute>} />
        <Route path="alias-catalog" element={<PermissionRoute module="aliases"><AliasCatalog /></PermissionRoute>} />
        <Route path="masters" element={<Navigate to="/expenses" replace />} />
        <Route path="master-settings" element={<Navigate to="/expenses" replace />} />
        <Route path="sales-orders" element={<Navigate to="/sales" replace />} />
        <Route path="users" element={<SuperAdminRoute><UserManagement /></SuperAdminRoute>} />
        <Route path="settings" element={<SuperAdminRoute><Settings /></SuperAdminRoute>} />
        <Route path="activity-logs" element={<PermissionRoute module="activity_logs"><ActivityLogs /></PermissionRoute>} />
        <Route path="tasks" element={<PermissionRoute module="tasks" action="view"><Tasks /></PermissionRoute>} />


        {/* Maker-Checker Approval Workflow Routes */}
        <Route path="admin/approvals" element={<SuperAdminRoute><ApprovalQueue /></SuperAdminRoute>} />
        <Route path="approvals" element={<SuperAdminRoute><ApprovalQueue /></SuperAdminRoute>} />
        <Route path="my-approvals" element={<MyApprovals />} />

        <Route path="*" element={<Navigate to={prefixPath} replace />} />
      </Route>
      <Route path="*" element={<Navigate to={prefixPath} replace />} />
    </Routes>
  );
}

function RolePrefixLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const { rolePrefix } = useParams();
  const expectedPrefix = isSuperAdminUser(user) ? 'superadmin' : 'admin';
  const expectedPath = `/${expectedPrefix}`;
  const knownPrefix = rolePrefix === 'admin' || rolePrefix === 'superadmin';
  const suffix = knownPrefix ? location.pathname.slice(`/${rolePrefix}`.length) : location.pathname;
  const duplicatePrefix = `${expectedPath}${expectedPath}`;

  if (rolePrefix === expectedPrefix && location.pathname.startsWith(`${duplicatePrefix}/`)) {
    const normalizedPath = `${expectedPath}${location.pathname.slice(duplicatePrefix.length)}`;
    return <Navigate to={`${normalizedPath}${location.search}${location.hash}`} state={location.state} replace />;
  }

  if (rolePrefix !== expectedPrefix) {
    const expectedPrefixInSuffix = `/${expectedPrefix}`;
    const correctedSuffix = suffix === expectedPrefixInSuffix || suffix.startsWith(`${expectedPrefixInSuffix}/`)
      ? suffix.slice(expectedPrefixInSuffix.length)
      : suffix;
    return <Navigate to={`${expectedPath}${correctedSuffix}${location.search}${location.hash}`} state={location.state} replace />;
  }
  return <Layout />;
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <StockViewProvider>
          <Router basename={import.meta.env.BASE_URL}>
            <AppRoutes />
          </Router>
        </StockViewProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
