/**
 * StudentDashboard Component - Main Student Portal Container
 *
 * This component manages the entire student portal interface with modern brand styling.
 * Coordinates navigation, data loading, and view rendering for all student features.
 */

import React, { useState, useEffect } from 'react';
import { Box } from '@mui/material';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services';
import StudentSidebar from './components/StudentSidebar';
import StudentHeader from './components/StudentHeader';
import StudentOverviewView from './components/StudentOverviewView';
import StudentScheduleView from './components/StudentScheduleView';
import StudentTrackingView from './components/StudentTrackingView';
import StudentProfileView from './components/StudentProfileView';
import StudentFeeSubmissionView from './components/StudentFeeSubmissionView';
import LiveTrackingView from './components/LiveTrackingView';
import VirtualTransportCard from './components/VirtualTransportCard';
import NotificationPanel from '../../components/NotificationPanel';
import { BACKGROUND_GRADIENTS } from '../../styles/brandStyles';

const StudentDashboard = () => {
  // Authentication and navigation
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // State for student data
  const [assignedBus, setAssignedBus] = useState(null);
  const [assignedRoute, setAssignedRoute] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  /**
   * Toggle mobile drawer open/close state
   * Used for responsive sidebar on smaller screens
   */
  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  useEffect(() => {
    loadStudentData();
  }, [user]);

  const loadStudentData = async () => {
    if (!user) return;

    try {
      const userResponse = await authService.getMe();
      const userData = userResponse.data.data || userResponse.data;

      if (userData?.assignedBus) {
        if (typeof userData.assignedBus === 'object' && userData.assignedBus._id) {
          setAssignedBus(userData.assignedBus);

          if (userData.assignedBus.routeId) {
            if (typeof userData.assignedBus.routeId === 'object') {
              setAssignedRoute(userData.assignedBus.routeId);
            }
          }
        }
      } else {
        setAssignedBus(null);
        setAssignedRoute(null);
      }
    } catch (error) {
      console.error('Error loading student data:', error);
    }
  };

  if (!user || user.role !== 'student') {
    navigate('/');
    return null;
  }



  return (
    // Main layout container with brand gradient background
    <Box sx={{
      display: 'flex',
      // Gradient background matching landing page aesthetic
      background: BACKGROUND_GRADIENTS.page,
      minHeight: '100vh',
    }}>
      {/* Left Sidebar - Navigation with brand styling */}
      <StudentSidebar
        user={user}
        logout={logout}
        navigate={navigate}
        mobileOpen={mobileOpen}
        handleDrawerToggle={handleDrawerToggle}
      />

      {/* Main Content Area */}
      <Box component="main" sx={{
        flexGrow: 1,
        overflow: 'auto',
        transition: 'all 0.3s ease',
      }}>
        {/* Top Header with user info */}
        <StudentHeader
          handleDrawerToggle={handleDrawerToggle}
          onRefresh={handleRefresh}
        />

        {/* URL-based nested routes */}
        <React.Fragment key={refreshKey}>
          <Routes>
            <Route index element={<StudentOverviewView />} />
            <Route path="fee-submission" element={<StudentFeeSubmissionView />} />
            <Route path="schedule" element={<StudentScheduleView />} />
            <Route path="tracking" element={<StudentTrackingView />} />
            <Route path="live-tracking" element={<LiveTrackingView />} />
            <Route path="profile" element={<StudentProfileView />} />
            <Route path="transport-card" element={
              <Box display="flex" justifyContent="center" p={4}>
                <VirtualTransportCard user={user} assignedBus={assignedBus} assignedRoute={assignedRoute} />
              </Box>
            } />
            <Route path="notifications" element={
              <Box p={3}>
                <NotificationPanel maxHeight={"calc(100vh - 200px)"} />
              </Box>
            } />
            <Route path="*" element={<Navigate to="/student" replace />} />
          </Routes>
        </React.Fragment>
      </Box>
    </Box>
  );
};

export default StudentDashboard;