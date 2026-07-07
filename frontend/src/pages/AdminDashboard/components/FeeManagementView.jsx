import React, { useState, useEffect } from 'react';
import {
  Container, Grid, Card, CardContent, Typography, Box, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Chip, IconButton, Avatar,
  Button, Dialog, DialogTitle, DialogContent, DialogActions,
  Select, MenuItem, FormControl, InputLabel, Snackbar, Alert as MuiAlert, Tab, Tabs
} from '@mui/material';
import Tooltip from '@mui/material/Tooltip';
import {
  Payment, Edit, FilterList, PersonOff, CheckCircleOutline, ErrorOutline, Warning,
  Visibility, HourglassTop, CheckCircle, Cancel, Receipt
} from '@mui/icons-material';
import { userService } from '../../../services';
import { BRAND_COLORS, BUTTON_STYLES, BORDER_RADIUS } from '../../../styles/brandStyles';
import ConfirmDialog from '../../../components/ConfirmDialog';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const FeeManagementView = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feeSearchQuery, setFeeSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [openFeeStatusDialog, setOpenFeeStatusDialog] = useState(false);
  const [feeStatus, setFeeStatus] = useState('pending');
  const [unpaidOnly, setUnpaidOnly] = useState(false);
  const [isDisplacing, setIsDisplacing] = useState(false);
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });
  const [openMarkDefaultersConfirm, setOpenMarkDefaultersConfirm] = useState(false);
  const [defaultersToMarkCount, setDefaultersToMarkCount] = useState(0);

  // Receipt review state
  const [openReceiptDialog, setOpenReceiptDialog] = useState(false);
  const [reviewingStudent, setReviewingStudent] = useState(null);
  const [reviewFeeStatus, setReviewFeeStatus] = useState('paid');
  const [isReviewing, setIsReviewing] = useState(false);
  const [receiptFilter, setReceiptFilter] = useState('all'); // 'all', 'pending_review'

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await userService.getUsers({ limit: 100 });
      setUsers((response.data && response.data.data) || []);
    } catch (error) {
      console.error('Error loading data:', error);
      showSnack('Error loading data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showSnack = (message, severity = 'success') => {
    setSnack({ open: true, message, severity });
  };

  const formatFeeStatus = (status) => {
    switch (status) {
      case 'paid': return 'Paid';
      case 'partially_paid': return 'Partially Paid';
      case 'pending': return 'Pending';
      case 'defaulter': return 'Defaulter';
      default: return status;
    }
  };

  const formatReceiptStatus = (status) => {
    switch (status) {
      case 'pending_review': return 'Pending Review';
      case 'approved': return 'Approved';
      case 'rejected': return 'Rejected';
      case 'not_submitted': return 'Not Submitted';
      default: return 'Not Submitted';
    }
  };

  const getReceiptStatusColor = (status) => {
    switch (status) {
      case 'pending_review': return 'warning';
      case 'approved': return 'success';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const getReceiptStatusIcon = (status) => {
    switch (status) {
      case 'pending_review': return <HourglassTop fontSize="small" />;
      case 'approved': return <CheckCircle fontSize="small" />;
      case 'rejected': return <Cancel fontSize="small" />;
      default: return null;
    }
  };

  const openDialog = (student) => {
    setSelectedStudent(student);
    setFeeStatus(student.feeStatus || 'pending');
    setOpenFeeStatusDialog(true);
  };

  const closeDialog = () => {
    setOpenFeeStatusDialog(false);
    setSelectedStudent(null);
    setFeeStatus('pending');
  };

  const handleSubmit = async () => {
    try {
      await userService.updateUser(selectedStudent._id, { feeStatus });
      showSnack('Fee status updated successfully');
      closeDialog();
      loadData();
    } catch (error) {
      console.error('Error updating fee status:', error);
      showSnack('Failed to update fee status', 'error');
    }
  };

  // Receipt review handlers
  const openReceiptReview = (student) => {
    setReviewingStudent(student);
    setReviewFeeStatus('paid');
    setOpenReceiptDialog(true);
  };

  const closeReceiptReview = () => {
    setOpenReceiptDialog(false);
    setReviewingStudent(null);
    setReviewFeeStatus('paid');
  };

  const handleApproveReceipt = async () => {
    try {
      setIsReviewing(true);
      await userService.reviewFeeReceipt(reviewingStudent._id, {
        action: 'approve',
        feeStatus: reviewFeeStatus
      });
      showSnack(`Fee receipt approved — status set to ${reviewFeeStatus === 'paid' ? 'Paid' : 'Partially Paid'}`);
      closeReceiptReview();
      loadData();
    } catch (error) {
      console.error('Error approving receipt:', error);
      showSnack(error.response?.data?.message || 'Failed to approve receipt', 'error');
    } finally {
      setIsReviewing(false);
    }
  };

  const handleRejectReceipt = async () => {
    try {
      setIsReviewing(true);
      await userService.reviewFeeReceipt(reviewingStudent._id, {
        action: 'reject'
      });
      showSnack('Fee receipt rejected');
      closeReceiptReview();
      loadData();
    } catch (error) {
      console.error('Error rejecting receipt:', error);
      showSnack(error.response?.data?.message || 'Failed to reject receipt', 'error');
    } finally {
      setIsReviewing(false);
    }
  };


  const handleMarkDefaulters = async () => {
    const studentsToMark = filteredStudents.filter(s => s.feeStatus === 'partially_paid');
    if (studentsToMark.length === 0) {
      showSnack('No partially paid students found to mark as defaulters', 'info');
      return;
    }

    setDefaultersToMarkCount(studentsToMark.length);
    setOpenMarkDefaultersConfirm(true);
  };

  const confirmMarkDefaulters = async () => {
    try {
      setOpenMarkDefaultersConfirm(false);
      setIsDisplacing(true);
      await userService.markFeeDefaulters();
      showSnack(`Successfully updated students and unassigned them from buses`);
      loadData();
    } catch (error) {
      console.error('Error marking defaulters:', error);
      showSnack('Error marking defaulters. Please try again.', 'error');
    } finally {
      setIsDisplacing(false);
    }
  };

  const filteredStudents = users
    .filter(u => u.role === 'student')
    .filter(u => !unpaidOnly || u.feeStatus !== 'paid')
    .filter(u => receiptFilter === 'all' || u.feeReceiptStatus === receiptFilter)
    .filter(u => !feeSearchQuery || u.studentId?.toLowerCase().includes(feeSearchQuery.toLowerCase()) || u.name?.toLowerCase().includes(feeSearchQuery.toLowerCase()));

  // Count pending receipts for badge
  const pendingReceiptsCount = users.filter(u => u.role === 'student' && u.feeReceiptStatus === 'pending_review').length;

  // Build the receipt file URL with auth token
  const getAuthenticatedReceiptUrl = (studentId) => {
    const token = localStorage.getItem('authToken');
    return `${API_BASE}/api/users/${studentId}/fee-receipt?token=${token}`;
  };

  return (
    <Container maxWidth="xl" sx={{ p: 3 }}>
      <Grid item xs={12}>
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
              <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
                <Typography variant="h6" sx={{ fontWeight: 700, color: BRAND_COLORS.slate900 }}>
                  Fee Management
                </Typography>
                <Button
                  size="small"
                  variant={unpaidOnly ? "contained" : "outlined"}
                  startIcon={<FilterList />}
                  onClick={() => setUnpaidOnly(!unpaidOnly)}
                  sx={{
                    borderRadius: BORDER_RADIUS.md,
                    textTransform: 'none',
                    fontWeight: 600,
                    ...(unpaidOnly ? {
                      bgcolor: BRAND_COLORS.errorRed,
                      '&:hover': { bgcolor: '#dc2626' }
                    } : {
                      color: BRAND_COLORS.slate700,
                      borderColor: BRAND_COLORS.slate300
                    })
                  }}
                >
                  {unpaidOnly ? "Showing Unpaid Only" : "Filter Unpaid"}
                </Button>

                {/* Receipt filter */}
                <Button
                  size="small"
                  variant={receiptFilter === 'pending_review' ? "contained" : "outlined"}
                  startIcon={<Receipt />}
                  onClick={() => setReceiptFilter(receiptFilter === 'pending_review' ? 'all' : 'pending_review')}
                  sx={{
                    borderRadius: BORDER_RADIUS.md,
                    textTransform: 'none',
                    fontWeight: 600,
                    ...(receiptFilter === 'pending_review' ? {
                      bgcolor: '#F59E0B',
                      '&:hover': { bgcolor: '#D97706' }
                    } : {
                      color: BRAND_COLORS.slate700,
                      borderColor: BRAND_COLORS.slate300
                    })
                  }}
                >
                  {receiptFilter === 'pending_review'
                    ? `Pending Receipts (${pendingReceiptsCount})`
                    : `Pending Receipts${pendingReceiptsCount > 0 ? ` (${pendingReceiptsCount})` : ''}`
                  }
                </Button>

                {unpaidOnly && filteredStudents.some(s => s.feeStatus === 'partially_paid') && (
                  <Button
                    size="small"
                    variant="contained"
                    color="error"
                    startIcon={<PersonOff />}
                    onClick={handleMarkDefaulters}
                    disabled={isDisplacing}
                    sx={{ borderRadius: BORDER_RADIUS.md, textTransform: 'none', fontWeight: 600 }}
                  >
                    Mark Defaulters
                  </Button>
                )}
              </Box>
              <Box
                component="input"
                placeholder="Search by Student ID or Name..."
                value={feeSearchQuery}
                onChange={(e) => setFeeSearchQuery(e.target.value)}
                sx={{
                  px: 2, py: 1, borderRadius: BORDER_RADIUS.md,
                  border: `1px solid ${BRAND_COLORS.slate300}`,
                  outline: 'none',
                  fontSize: '0.875rem',
                  minWidth: 280,
                  transition: 'all 0.3s ease',
                  '&:focus': {
                    borderColor: BRAND_COLORS.skyBlue,
                    boxShadow: `0 0 0 2px rgba(14, 165, 233, 0.1)`
                  }
                }}
              />
            </Box>

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Student</TableCell>
                    <TableCell>Student ID</TableCell>
                    <TableCell>Fee Status</TableCell>
                    <TableCell>Receipt</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredStudents.map(student => (
                    <TableRow key={student._id} sx={{
                      ...(student.feeReceiptStatus === 'pending_review' && {
                        bgcolor: 'rgba(245, 158, 11, 0.04)',
                      })
                    }}>
                      <TableCell sx={{ py: 1 }}>
                        <Box display="flex" alignItems="center" gap={1.5}>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: '#e0e0e0', fontSize: '0.875rem' }}>
                            {student.name?.charAt(0)}
                          </Avatar>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{student.name}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{student.studentId || 'N/A'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={formatFeeStatus(student.feeStatus)}
                          size="small"
                          color={
                            student.feeStatus === 'paid' ? 'success' :
                              student.feeStatus === 'partially_paid' ? 'warning' :
                                student.feeStatus === 'defaulter' ? 'error' : 'default'
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={getReceiptStatusIcon(student.feeReceiptStatus)}
                          label={formatReceiptStatus(student.feeReceiptStatus)}
                          size="small"
                          color={getReceiptStatusColor(student.feeReceiptStatus)}
                          variant={student.feeReceiptStatus === 'pending_review' ? 'filled' : 'outlined'}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Box display="flex" justifyContent="flex-end" gap={1}>
                          {/* View/Review Receipt button - shown when receipt exists */}
                          {student.feeReceipt && (
                            <Tooltip title={student.feeReceiptStatus === 'pending_review' ? 'Review Receipt' : 'View Receipt'}>
                              <IconButton
                                size="small"
                                onClick={() => openReceiptReview(student)}
                                sx={{
                                  color: student.feeReceiptStatus === 'pending_review' ? '#F59E0B' : BRAND_COLORS.teal,
                                  bgcolor: student.feeReceiptStatus === 'pending_review'
                                    ? 'rgba(245, 158, 11, 0.08)'
                                    : 'rgba(20, 184, 166, 0.08)',
                                  '&:hover': {
                                    bgcolor: student.feeReceiptStatus === 'pending_review'
                                      ? 'rgba(245, 158, 11, 0.15)'
                                      : 'rgba(20, 184, 166, 0.15)',
                                  }
                                }}
                              >
                                <Visibility fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}

                          <Tooltip title="Update Fee Status">
                            <IconButton
                              size="small"
                              onClick={() => openDialog(student)}
                              sx={{
                                color: BRAND_COLORS.skyBlue,
                                bgcolor: 'rgba(14, 165, 233, 0.08)',
                                '&:hover': { bgcolor: 'rgba(14, 165, 233, 0.15)' }
                              }}
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                          </Tooltip>

                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {filteredStudents.length === 0 && (
              <Box textAlign="center" py={6}>
                <Payment sx={{ fontSize: 64, color: 'grey.400' }} />
                <Typography color="text.secondary">No students found</Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>


      {/* Fee Status Dialog — simple, fee-only */}
      <Dialog open={openFeeStatusDialog} onClose={closeDialog} maxWidth="xs" fullWidth>
        <DialogTitle>
          Update Fee Status — {selectedStudent?.name}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Fee Status</InputLabel>
              <Select
                value={feeStatus}
                label="Fee Status"
                onChange={(e) => setFeeStatus(e.target.value)}
              >
                <MenuItem value="pending">
                  <Box display="flex" alignItems="center" gap={1}>
                    <ErrorOutline fontSize="small" color="error" /> Pending
                  </Box>
                </MenuItem>
                <MenuItem value="partially_paid">
                  <Box display="flex" alignItems="center" gap={1}>
                    <Warning fontSize="small" sx={{ color: '#f59e0b' }} /> Partially Paid
                  </Box>
                </MenuItem>
                <MenuItem value="paid">
                  <Box display="flex" alignItems="center" gap={1}>
                    <CheckCircleOutline fontSize="small" color="success" /> Paid
                  </Box>
                </MenuItem>
                <MenuItem value="defaulter">
                  <Box display="flex" alignItems="center" gap={1}>
                    <PersonOff fontSize="small" color="error" /> Defaulter
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>

            {selectedStudent?.feeNotes && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#334155' }}>
                  Payment History / Audit Log:
                </Typography>
                <Typography variant="caption" sx={{
                  display: 'block',
                  whiteSpace: 'pre-wrap',
                  color: '#475569',
                  bgcolor: '#F8FAFC',
                  p: 1.5,
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  maxHeight: 150,
                  overflowY: 'auto',
                  fontFamily: 'inherit'
                }}>
                  {selectedStudent.feeNotes}
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit} sx={BUTTON_STYLES.primary}>Update</Button>
        </DialogActions>
      </Dialog>

      {/* Receipt Review Dialog */}
      <Dialog open={openReceiptDialog} onClose={closeReceiptReview} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Receipt sx={{ color: BRAND_COLORS.skyBlue }} />
          Fee Receipt — {reviewingStudent?.name}
          {reviewingStudent?.feeReceiptStatus === 'pending_review' && (
            <Chip label="Pending Review" color="warning" size="small" sx={{ ml: 1, fontWeight: 600 }} />
          )}
          {reviewingStudent?.feeReceiptStatus === 'approved' && (
            <Chip label="Approved" color="success" size="small" sx={{ ml: 1, fontWeight: 600 }} />
          )}
          {reviewingStudent?.feeReceiptStatus === 'rejected' && (
            <Chip label="Rejected" color="error" size="small" sx={{ ml: 1, fontWeight: 600 }} />
          )}
        </DialogTitle>
        <DialogContent dividers>
          {reviewingStudent && (
            <Box>
              {/* Student Info Summary */}
              <Box display="flex" gap={2} mb={3} flexWrap="wrap">
                <Box sx={{
                  flex: 1, minWidth: 150,
                  p: 1.5, borderRadius: BORDER_RADIUS.md,
                  bgcolor: BRAND_COLORS.slate100,
                  border: `1px solid ${BRAND_COLORS.slate300}`,
                }}>
                  <Typography variant="caption" sx={{ color: BRAND_COLORS.slate600, fontWeight: 600 }}>Student ID</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{reviewingStudent.studentId || 'N/A'}</Typography>
                </Box>
                <Box sx={{
                  flex: 1, minWidth: 150,
                  p: 1.5, borderRadius: BORDER_RADIUS.md,
                  bgcolor: BRAND_COLORS.slate100,
                  border: `1px solid ${BRAND_COLORS.slate300}`,
                }}>
                  <Typography variant="caption" sx={{ color: BRAND_COLORS.slate600, fontWeight: 600 }}>Current Fee Status</Typography>
                  <Box mt={0.5}>
                    <Chip label={formatFeeStatus(reviewingStudent.feeStatus)} size="small" color={
                      reviewingStudent.feeStatus === 'paid' ? 'success' :
                        reviewingStudent.feeStatus === 'partially_paid' ? 'warning' :
                          reviewingStudent.feeStatus === 'defaulter' ? 'error' : 'default'
                    } />
                  </Box>
                </Box>
                {reviewingStudent.feeReceiptSubmittedAt && (
                  <Box sx={{
                    flex: 1, minWidth: 150,
                    p: 1.5, borderRadius: BORDER_RADIUS.md,
                    bgcolor: BRAND_COLORS.slate100,
                    border: `1px solid ${BRAND_COLORS.slate300}`,
                  }}>
                    <Typography variant="caption" sx={{ color: BRAND_COLORS.slate600, fontWeight: 600 }}>Submitted On</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {new Date(reviewingStudent.feeReceiptSubmittedAt).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'short', day: 'numeric'
                      })}
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Receipt Preview */}
              <Box sx={{
                border: `1px solid ${BRAND_COLORS.slate300}`,
                borderRadius: BORDER_RADIUS.lg,
                overflow: 'hidden',
                mb: 3,
                bgcolor: '#fafafa',
              }}>
                <Typography variant="subtitle2" sx={{
                  px: 2, py: 1.5,
                  bgcolor: BRAND_COLORS.slate100,
                  borderBottom: `1px solid ${BRAND_COLORS.slate300}`,
                  fontWeight: 600,
                  color: BRAND_COLORS.slate700,
                }}>
                  Uploaded Receipt
                </Typography>
                <Box sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  minHeight: 300,
                  p: 2,
                }}>
                  {reviewingStudent.feeReceipt?.match(/\.(jpg|jpeg|png|webp)$/i) ? (
                    <Box
                      component="img"
                      src={`${API_BASE}/${reviewingStudent.feeReceipt}`}
                      alt="Fee receipt"
                      sx={{
                        maxWidth: '100%',
                        maxHeight: 450,
                        borderRadius: BORDER_RADIUS.md,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      }}
                    />
                  ) : (
                    <Box textAlign="center">
                      <Typography variant="body2" sx={{ color: BRAND_COLORS.slate600, mb: 2 }}>
                        PDF Receipt — Click below to view in a new tab
                      </Typography>
                      <Button
                        variant="outlined"
                        startIcon={<Visibility />}
                        onClick={() => window.open(`${API_BASE}/${reviewingStudent.feeReceipt}`, '_blank')}
                        sx={{
                          borderRadius: BORDER_RADIUS.md,
                          textTransform: 'none',
                          fontWeight: 600,
                          borderColor: BRAND_COLORS.skyBlue,
                          color: BRAND_COLORS.skyBlue,
                        }}
                      >
                        Open PDF
                      </Button>
                    </Box>
                  )}
                </Box>
              </Box>

              {/* Action Section — only for pending_review receipts */}
              {reviewingStudent.feeReceiptStatus === 'pending_review' && (
                <Box sx={{
                  p: 2.5,
                  borderRadius: BORDER_RADIUS.md,
                  bgcolor: 'rgba(14, 165, 233, 0.04)',
                  border: `1px solid rgba(14, 165, 233, 0.15)`,
                }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: BRAND_COLORS.slate900, mb: 2 }}>
                    Review Action
                  </Typography>

                  <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                      <InputLabel>Set Fee Status</InputLabel>
                      <Select
                        value={reviewFeeStatus}
                        label="Set Fee Status"
                        onChange={(e) => setReviewFeeStatus(e.target.value)}
                      >
                        <MenuItem value="paid">
                          <Box display="flex" alignItems="center" gap={1}>
                            <CheckCircleOutline fontSize="small" color="success" /> Paid
                          </Box>
                        </MenuItem>
                        <MenuItem value="partially_paid">
                          <Box display="flex" alignItems="center" gap={1}>
                            <Warning fontSize="small" sx={{ color: '#f59e0b' }} /> Partially Paid
                          </Box>
                        </MenuItem>
                      </Select>
                    </FormControl>

                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<CheckCircle />}
                      onClick={handleApproveReceipt}
                      disabled={isReviewing}
                      sx={{
                        borderRadius: BORDER_RADIUS.md,
                        textTransform: 'none',
                        fontWeight: 600,
                        px: 3,
                      }}
                    >
                      Approve
                    </Button>

                    <Button
                      variant="contained"
                      color="error"
                      startIcon={<Cancel />}
                      onClick={handleRejectReceipt}
                      disabled={isReviewing}
                      sx={{
                        borderRadius: BORDER_RADIUS.md,
                        textTransform: 'none',
                        fontWeight: 600,
                        px: 3,
                      }}
                    >
                      Reject
                    </Button>
                  </Box>
                </Box>
              )}

              {/* Fee Notes / Audit Log */}
              {reviewingStudent.feeNotes && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#334155' }}>
                    Payment History / Audit Log:
                  </Typography>
                  <Typography variant="caption" sx={{
                    display: 'block',
                    whiteSpace: 'pre-wrap',
                    color: '#475569',
                    bgcolor: '#F8FAFC',
                    p: 1.5,
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    maxHeight: 150,
                    overflowY: 'auto',
                    fontFamily: 'inherit'
                  }}>
                    {reviewingStudent.feeNotes}
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeReceiptReview}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Mark Defaulters Confirmation */}
      <ConfirmDialog
        open={openMarkDefaultersConfirm}
        title="Mark Fee Defaulters"
        message={`Are you sure you want to mark all ${defaultersToMarkCount} partially paid students as defaulters? They will be unassigned from their buses and their transport cards will be disabled.`}
        confirmText="Mark as Defaulter"
        variant="danger"
        onConfirm={confirmMarkDefaulters}
        onCancel={() => setOpenMarkDefaultersConfirm(false)}
        loading={isDisplacing}
      />

      {/* Snackbar */}
      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <MuiAlert
          onClose={() => setSnack(prev => ({ ...prev, open: false }))}
          severity={snack.severity}
          sx={{ width: '100%' }}
        >
          {snack.message}
        </MuiAlert>
      </Snackbar>
    </Container>
  );
};

export default FeeManagementView;