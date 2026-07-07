import React, { useState } from 'react';
import {
  Box, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Drawer, Avatar, Typography, IconButton, useTheme, useMediaQuery
} from '@mui/material';
import {
  Dashboard, Schedule, LocationOn, Person, QrCode2, Notifications, Logout, Payment
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import LogoutConfirmDialog from '../../../components/LogoutConfirmDialog';
import {
  BRAND_COLORS,
  SIDEBAR_STYLES,
  BORDER_RADIUS,
  gradientText,
} from '../../../styles/brandStyles';

const drawerWidth = 280;

const menuItems = [
  { path: '/student', label: 'Overview', icon: <Dashboard /> },
  { path: '/student/fee-submission', label: 'Fee Submission', icon: <Payment /> },
  { path: '/student/schedule', label: 'Schedule', icon: <Schedule /> },
  { path: '/student/live-tracking', label: 'Live Tracking', icon: <LocationOn /> },
  { path: '/student/transport-card', label: 'Transport Card', icon: <QrCode2 /> },
  { path: '/student/notifications', label: 'Notifications', icon: <Notifications /> },
  { path: '/student/profile', label: 'Profile', icon: <Person /> },
];

const StudentSidebar = ({ user, logout, navigate, mobileOpen, handleDrawerToggle }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const location = useLocation();
  const nav = useNavigate();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = () => {
    setShowLogoutDialog(true);
  };

  const confirmLogout = async () => {
    setIsLoggingOut(true);
    await logout();
    toast.success("You have been logged out successfully.");
    navigate('/');
    setShowLogoutDialog(false);
    setIsLoggingOut(false);
  };

  // Determine active menu item from current URL
  const isActive = (path) => {
    if (path === '/student') return location.pathname === '/student';
    return location.pathname.startsWith(path);
  };

  const handleMenuItemClick = (path) => {
    nav(path);
    if (isMobile && handleDrawerToggle) {
      handleDrawerToggle();
    }
  };

  const drawerContent = (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      bgcolor: BRAND_COLORS.white 
    }}>
      {/* Scrollable area for Logo and Menu */}
      <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
        {/* Brand Logo Section with gradient styling */}
        <Box sx={{
          p: 3,
          borderBottom: `1px solid ${BRAND_COLORS.slate300}`
        }}>
          <Box display="flex" alignItems="center" gap={1.5}>
            {/* Gradient Icon Box */}
            <Box sx={{
              width: 48,
              height: 48,
              borderRadius: BORDER_RADIUS.xl,
              background: BRAND_COLORS.primaryGradient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(14, 165, 233, 0.3)',
            }}>
              <Person sx={{ color: BRAND_COLORS.white, fontSize: 28 }} />
            </Box>
            <Box>
              {/* Brand Name with gradient text */}
              <Typography
                variant="h6"
                sx={{
                  ...SIDEBAR_STYLES.logo,
                  fontSize: '1.1rem',
                }}
              >
                MyCampusRide
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: BRAND_COLORS.slate600,
                  fontWeight: 500,
                }}
              >
                Student Portal
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Navigation Menu Items with brand styling */}
        <List sx={{ px: 2, pt: 2 }}>
          {menuItems.map((item) => {
            const active = isActive(item.path);
            return (
              <ListItem key={item.path} disablePadding>
                <ListItemButton
                  onClick={() => handleMenuItemClick(item.path)}
                  sx={{
                    mb: 0.5,
                    borderRadius: BORDER_RADIUS.md,
                    // Active state: gradient background with white text
                    ...(active && SIDEBAR_STYLES.menuItemActive),
                    // Inactive state: transparent background
                    bgcolor: active ? undefined : 'transparent',
                    color: active ? BRAND_COLORS.white : BRAND_COLORS.slate700,
                    fontWeight: active ? 600 : 500,
                    '&:hover': {
                      // Hover on active: slightly darker gradient
                      ...(active ? {
                        background: BRAND_COLORS.primaryGradientHover,
                      } : {
                        // Hover on inactive: light blue background with slide effect
                        ...SIDEBAR_STYLES.menuItemHover,
                        transform: 'translateX(4px)',
                      }),
                    },
                    transition: 'all 0.3s ease',
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      fontWeight: active ? 600 : 500,
                      fontSize: '0.95rem'
                    }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Box>

      {/* User Profile Section at bottom with brand styling - Fixed at bottom of flex */}
      <Box sx={{
        p: 2,
        borderTop: `1px solid ${BRAND_COLORS.slate300}`,
        bgcolor: BRAND_COLORS.slate100,
      }}>
        <Box display="flex" alignItems="center" gap={1.5}>
          {/* User Avatar with gradient border */}
          <Box sx={{
            p: 0.35,
            borderRadius: '50%',
            background: BRAND_COLORS.primaryGradient,
            display: 'flex',
          }}>
            <Avatar
              src={user?.profilePicture ? `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/${user.profilePicture}` : undefined}
              sx={{
                bgcolor: BRAND_COLORS.white,
                color: BRAND_COLORS.skyBlue,
                fontWeight: 700,
              }}
            >
              {user?.name?.charAt(0).toUpperCase() || 'S'}
            </Avatar>
          </Box>
          <Box flex={1} minWidth={0}>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                color: BRAND_COLORS.slate900,
              }}
              noWrap
            >
              {user?.name || 'Student'}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: BRAND_COLORS.slate600,
              }}
              noWrap
            >
              {user?.email || 'N/A'}
            </Typography>
          </Box>
          {/* Logout Button with brand error color */}
          <IconButton
            size="small"
            onClick={handleLogout}
            sx={{
              color: BRAND_COLORS.errorRed,
              transition: 'all 0.3s ease',
              '&:hover': {
                bgcolor: BRAND_COLORS.errorRed,
                color: BRAND_COLORS.white,
                transform: 'scale(1.1)',
              }
            }}
          >
            <Logout fontSize="small" />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );

  return (
    <>
      {/* Mobile Drawer: Temporary, slides in from left */}
      {isMobile ? (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              width: SIDEBAR_STYLES.width,
              boxSizing: 'border-box',
              bgcolor: BRAND_COLORS.white,
            },
          }}
        >
          {drawerContent}
        </Drawer>
      ) : (
        /* Desktop Drawer: Permanent, always visible */
        <Drawer
          variant="permanent"
          sx={{
            width: SIDEBAR_STYLES.width,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: SIDEBAR_STYLES.width,
              boxSizing: 'border-box',
              bgcolor: BRAND_COLORS.white,
              borderRight: `1px solid ${BRAND_COLORS.slate300}`,
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      <LogoutConfirmDialog
        open={showLogoutDialog}
        onClose={() => setShowLogoutDialog(false)}
        onConfirm={confirmLogout}
        loading={isLoggingOut}
      />
    </>
  );
};

export default StudentSidebar;
