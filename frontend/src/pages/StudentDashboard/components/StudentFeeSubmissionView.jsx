/**
 * StudentFeeSubmissionView Component
 *
 * Student-facing interface for uploading fee receipts.
 * Features:
 * - Current fee status display
 * - Receipt upload with drag & drop + file preview
 * - Receipt submission status tracker
 * - Upload history in audit log
 *
 * Follows the same brand styling patterns as StudentProfileView.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Container, Card, CardContent, Typography, Box, Button, Chip,
  CircularProgress, LinearProgress, Alert as MuiAlert
} from '@mui/material';
import {
  Payment, CloudUpload, CheckCircle, HourglassTop,
  Cancel, Description, InsertDriveFile, Replay
} from '@mui/icons-material';
import { authService } from '../../../services';
import { toast } from 'react-toastify';
import {
  BRAND_COLORS,
  CARD_STYLES,
  BORDER_RADIUS,
  BUTTON_STYLES,
} from '../../../styles/brandStyles';

const StudentFeeSubmissionView = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const response = await authService.getMe();
      const userData = response.data.data || response.data;
      setUser(userData);
    } catch (error) {
      console.error('Error loading user data:', error);
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (file) => {
    if (!file) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only PDF or image files (JPEG, PNG, WEBP) are allowed');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(null);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.warning('Please select a file first');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('feeReceipt', selectedFile);

      const response = await authService.uploadFeeReceipt(formData);
      const updatedUser = response.data?.data || response.data;
      setUser(updatedUser);
      setSelectedFile(null);
      setPreviewUrl(null);
      toast.success('Fee receipt uploaded successfully! It is now pending admin review.');
    } catch (error) {
      console.error('Error uploading fee receipt:', error);
      const errorMessage = error.response?.data?.message || 'Failed to upload fee receipt. Please try again.';
      toast.error(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getReceiptStatusConfig = (status) => {
    switch (status) {
      case 'pending_review':
        return {
          label: 'Pending Review',
          color: 'warning',
          icon: <HourglassTop />,
          description: 'Your receipt has been submitted and is awaiting admin review.',
          bgColor: 'rgba(245, 158, 11, 0.08)',
          borderColor: 'rgba(245, 158, 11, 0.3)',
        };
      case 'approved':
        return {
          label: 'Approved',
          color: 'success',
          icon: <CheckCircle />,
          description: 'Your fee receipt has been reviewed and approved by the admin.',
          bgColor: 'rgba(16, 185, 129, 0.08)',
          borderColor: 'rgba(16, 185, 129, 0.3)',
        };
      case 'rejected':
        return {
          label: 'Rejected',
          color: 'error',
          icon: <Cancel />,
          description: 'Your fee receipt was rejected. Please upload a valid receipt.',
          bgColor: 'rgba(239, 68, 68, 0.08)',
          borderColor: 'rgba(239, 68, 68, 0.3)',
        };
      default:
        return {
          label: 'Not Submitted',
          color: 'default',
          icon: <Description />,
          description: 'You have not submitted a fee receipt yet. Upload one below.',
          bgColor: BRAND_COLORS.slate100,
          borderColor: BRAND_COLORS.slate300,
        };
    }
  };

  const getFeeStatusConfig = (status) => {
    switch (status) {
      case 'paid': return { label: 'Paid', color: 'success' };
      case 'partially_paid': return { label: 'Partially Paid', color: 'warning' };
      case 'defaulter': return { label: 'Defaulter', color: 'error' };
      default: return { label: 'Pending', color: 'default' };
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ p: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <CircularProgress size={32} sx={{ color: BRAND_COLORS.skyBlue }} />
          <Typography variant="h6" sx={{ color: BRAND_COLORS.slate700 }}>Loading fee information...</Typography>
        </Box>
      </Container>
    );
  }

  const receiptStatus = getReceiptStatusConfig(user?.feeReceiptStatus);
  const feeStatusConfig = getFeeStatusConfig(user?.feeStatus);
  const canUpload = !user?.feeReceiptStatus || user?.feeReceiptStatus === 'not_submitted' || user?.feeReceiptStatus === 'rejected';

  return (
    <Container maxWidth="md" sx={{ p: 4 }}>
      {/* Header */}
      <Card sx={{
        ...CARD_STYLES.standard,
        border: `1px solid ${BRAND_COLORS.slate300}`,
        mb: 3,
      }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={2} mb={3}>
            <Box sx={{
              width: 56,
              height: 56,
              borderRadius: BORDER_RADIUS.xl,
              background: BRAND_COLORS.primaryGradient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(14, 165, 233, 0.3)',
            }}>
              <Payment sx={{ fontSize: 32, color: BRAND_COLORS.white }} />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: BRAND_COLORS.slate900 }}>
                Fee Submission
              </Typography>
              <Typography variant="body2" sx={{ color: BRAND_COLORS.slate600 }}>
                Upload your fee receipt for admin verification
              </Typography>
            </Box>
          </Box>

          {/* Status Summary Cards */}
          <Box display="flex" gap={2} flexWrap="wrap">
            {/* Fee Status */}
            <Box sx={{
              flex: 1, minWidth: 200,
              p: 2, borderRadius: BORDER_RADIUS.md,
              border: `1px solid ${BRAND_COLORS.slate300}`,
              bgcolor: BRAND_COLORS.slate100,
            }}>
              <Typography variant="caption" sx={{ color: BRAND_COLORS.slate600, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Fee Status
              </Typography>
              <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                <Chip label={feeStatusConfig.label} color={feeStatusConfig.color} size="small" sx={{ fontWeight: 600 }} />
              </Box>
            </Box>

            {/* Receipt Status */}
            <Box sx={{
              flex: 1, minWidth: 200,
              p: 2, borderRadius: BORDER_RADIUS.md,
              border: `1px solid ${receiptStatus.borderColor}`,
              bgcolor: receiptStatus.bgColor,
            }}>
              <Typography variant="caption" sx={{ color: BRAND_COLORS.slate600, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Receipt Status
              </Typography>
              <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                <Chip
                  icon={receiptStatus.icon}
                  label={receiptStatus.label}
                  color={receiptStatus.color}
                  size="small"
                  sx={{ fontWeight: 600 }}
                />
              </Box>
            </Box>

            {/* Submitted At */}
            {user?.feeReceiptSubmittedAt && (
              <Box sx={{
                flex: 1, minWidth: 200,
                p: 2, borderRadius: BORDER_RADIUS.md,
                border: `1px solid ${BRAND_COLORS.slate300}`,
                bgcolor: BRAND_COLORS.slate100,
              }}>
                <Typography variant="caption" sx={{ color: BRAND_COLORS.slate600, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Submitted On
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, color: BRAND_COLORS.slate900, mt: 0.5 }}>
                  {new Date(user.feeReceiptSubmittedAt).toLocaleDateString('en-US', {
                    year: 'numeric', month: 'short', day: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                  })}
                </Typography>
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Receipt Status Banner */}
      <Box sx={{
        p: 2, mb: 3,
        borderRadius: BORDER_RADIUS.md,
        bgcolor: receiptStatus.bgColor,
        border: `1px solid ${receiptStatus.borderColor}`,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
      }}>
        {React.cloneElement(receiptStatus.icon, { sx: { color: receiptStatus.color === 'default' ? BRAND_COLORS.slate500 : undefined } })}
        <Typography variant="body2" sx={{ color: BRAND_COLORS.slate700, fontWeight: 500 }}>
          {receiptStatus.description}
        </Typography>
      </Box>

      {/* Upload Section */}
      {canUpload && (
        <Card sx={{
          ...CARD_STYLES.standard,
          border: `1px solid ${BRAND_COLORS.slate300}`,
          mb: 3,
        }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: BRAND_COLORS.slate900, mb: 2 }}>
              {user?.feeReceiptStatus === 'rejected' ? 'Re-upload Fee Receipt' : 'Upload Fee Receipt'}
            </Typography>

            {/* Drag & Drop Zone */}
            <Box
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              sx={{
                p: 4,
                borderRadius: BORDER_RADIUS.lg,
                border: `2px dashed ${dragActive ? BRAND_COLORS.skyBlue : BRAND_COLORS.slate300}`,
                bgcolor: dragActive ? 'rgba(14, 165, 233, 0.04)' : BRAND_COLORS.slate100,
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': {
                  borderColor: BRAND_COLORS.skyBlue,
                  bgcolor: 'rgba(14, 165, 233, 0.04)',
                },
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                hidden
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={handleInputChange}
              />

              {selectedFile ? (
                // File Selected Preview
                <Box>
                  {previewUrl ? (
                    <Box sx={{
                      mb: 2,
                      display: 'flex',
                      justifyContent: 'center',
                    }}>
                      <Box
                        component="img"
                        src={previewUrl}
                        alt="Receipt preview"
                        sx={{
                          maxHeight: 200,
                          maxWidth: '100%',
                          borderRadius: BORDER_RADIUS.md,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        }}
                      />
                    </Box>
                  ) : (
                    <InsertDriveFile sx={{ fontSize: 64, color: BRAND_COLORS.skyBlue, mb: 1 }} />
                  )}
                  <Typography variant="body1" sx={{ fontWeight: 600, color: BRAND_COLORS.slate900 }}>
                    {selectedFile.name}
                  </Typography>
                  <Typography variant="caption" sx={{ color: BRAND_COLORS.slate600 }}>
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </Typography>
                  <Box mt={2} display="flex" justifyContent="center" gap={1}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={(e) => { e.stopPropagation(); clearSelection(); }}
                      sx={{
                        borderRadius: BORDER_RADIUS.md,
                        textTransform: 'none',
                        fontWeight: 600,
                        color: BRAND_COLORS.slate700,
                        borderColor: BRAND_COLORS.slate300,
                      }}
                    >
                      Change File
                    </Button>
                  </Box>
                </Box>
              ) : (
                // Empty State
                <Box>
                  <CloudUpload sx={{ fontSize: 64, color: BRAND_COLORS.skyBlue, mb: 1, opacity: 0.7 }} />
                  <Typography variant="body1" sx={{ fontWeight: 600, color: BRAND_COLORS.slate900, mb: 0.5 }}>
                    Drag & drop your fee receipt here
                  </Typography>
                  <Typography variant="body2" sx={{ color: BRAND_COLORS.slate600 }}>
                    or click to browse • PDF, JPEG, PNG, WEBP • Max 5MB
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Upload Progress */}
            {uploading && (
              <Box mt={2}>
                <LinearProgress sx={{
                  borderRadius: BORDER_RADIUS.xs,
                  height: 6,
                  '& .MuiLinearProgress-bar': {
                    background: BRAND_COLORS.primaryGradient,
                  }
                }} />
                <Typography variant="caption" sx={{ color: BRAND_COLORS.slate600, mt: 0.5, display: 'block', textAlign: 'center' }}>
                  Uploading your receipt...
                </Typography>
              </Box>
            )}

            {/* Upload Button */}
            <Box mt={3} textAlign="center">
              <Button
                variant="contained"
                size="large"
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
                startIcon={uploading ? <CircularProgress size={20} color="inherit" /> : <CloudUpload />}
                sx={{
                  ...BUTTON_STYLES.primary,
                  px: 5,
                  py: 1.5,
                }}
              >
                {uploading ? 'Uploading...' : 'Submit Fee Receipt'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Pending Review Info */}
      {user?.feeReceiptStatus === 'pending_review' && (
        <Card sx={{
          ...CARD_STYLES.standard,
          border: `1px solid rgba(245, 158, 11, 0.3)`,
          mb: 3,
        }}>
          <CardContent sx={{ p: 3 }}>
            <Box display="flex" alignItems="center" gap={1.5} mb={2}>
              <HourglassTop sx={{ color: '#F59E0B' }} />
              <Typography variant="h6" sx={{ fontWeight: 700, color: BRAND_COLORS.slate900 }}>
                Awaiting Admin Review
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ color: BRAND_COLORS.slate600 }}>
              Your fee receipt has been submitted and is currently being reviewed by the admin.
              You will receive a notification once it has been processed. Please check your
              notifications for updates.
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Fee Notes / Audit Log */}
      {user?.feeNotes && (
        <Card sx={{
          ...CARD_STYLES.standard,
          border: `1px solid ${BRAND_COLORS.slate300}`,
        }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: BRAND_COLORS.slate900, mb: 2 }}>
              Fee History
            </Typography>
            <Box sx={{
              whiteSpace: 'pre-wrap',
              color: BRAND_COLORS.slate700,
              bgcolor: BRAND_COLORS.slate100,
              p: 2,
              borderRadius: BORDER_RADIUS.md,
              border: `1px solid ${BRAND_COLORS.slate300}`,
              maxHeight: 200,
              overflowY: 'auto',
              fontSize: '0.85rem',
              lineHeight: 1.8,
              fontFamily: 'inherit',
            }}>
              {user.feeNotes}
            </Box>
          </CardContent>
        </Card>
      )}
    </Container>
  );
};

export default StudentFeeSubmissionView;
