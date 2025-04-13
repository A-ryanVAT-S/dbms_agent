import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Database, GitCompare, TableProperties, Zap, LayoutDashboard, LogOut } from 'lucide-react';
import { useAuth } from '../utils/authContext';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard className="mr-2" /> },
    { name: 'Query Translator', path: '/translator', icon: <GitCompare className="mr-2" /> },
    { name: 'Designer', path: '/designer', icon: <TableProperties className="mr-2" /> },
    { name: 'Query Optimizer', path: '/optimizer', icon: <Zap className="mr-2" /> },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-gray-800 border-b border-gray-700">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <span className="text-xl font-bold text-purple-400">SQL Agent</span>
          </div>
          <div className="flex items-center">
            <div className="flex">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center px-3 py-2 mx-1 rounded-md text-sm font-medium ${
                    location.pathname === item.path
                      ? 'bg-gray-700 text-blue-400'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-blue-300'
                  }`}
                >
                  {item.icon}
                  {item.name}
                </Link>
              ))}
            </div>
            <button
              onClick={handleLogout}
              className="ml-4 px-3 py-2 rounded-md flex items-center text-gray-100 bg-red-600 hover:bg-red-700"
            >
              <LogOut className="mr-2" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;