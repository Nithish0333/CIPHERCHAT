import React, { useState, useEffect, useCallback } from 'react';
import ApiService from '../services/ApiService';
import { useAuth } from '../contexts/AuthContext';
import 'bootstrap/dist/css/bootstrap.min.css';

const FriendRequests = () => {
  const { user } = useAuth();
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(new Set());

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = await ApiService.getFriendRequests();
      if (data.status === 'success') {
        const requests = data.data.friendRequests;
        setReceivedRequests(requests.filter(req => req.receiver._id === user?._id && req.status === 'pending'));
        setSentRequests(requests.filter(req => req.sender._id === user?._id && req.status === 'pending'));
      }
    } catch (error) {
      console.error('Fetch requests error:', error);
      setError('Failed to fetch friend requests');
    } finally {
      setLoading(false);
    }
  }, [user?._id]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleRequestAction = async (requestId, status) => {
    if (processing.has(requestId)) return;

    setProcessing(prev => new Set(prev).add(requestId));

    try {
      await ApiService.updateFriendRequest(requestId, status);

      // Remove from received requests
      setReceivedRequests(prev => prev.filter(req => req._id !== requestId));
    } catch (error) {
      console.error(`${status} request error:`, error);
      setError(`Failed to ${status} friend request`);
    } finally {
      setProcessing(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  const acceptRequest = (requestId) => handleRequestAction(requestId, 'accepted');
  const rejectRequest = (requestId) => handleRequestAction(requestId, 'rejected');

  return (
    <div className="friend-requests">
      <div className="card bg-dark border-success">
        <div className="card-header border-secondary">
          <h5 className="text-success mb-0">Friend Requests</h5>
        </div>
        <div className="card-body">
          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center text-success">
              <div className="spinner-border spinner-border-sm me-2"></div>
              Loading...
            </div>
          ) : (
            <div className="requests-container">
              {/* Received Requests */}
              {receivedRequests.length > 0 && (
                <div className="mb-4">
                  <h6 className="text-info mb-3">Received Requests</h6>
                  {receivedRequests.map((request) => (
                    <div key={request._id} className="d-flex align-items-center justify-content-between p-2 mb-2 bg-secondary rounded">
                      <div className="d-flex align-items-center">
                        <img
                          src={request.sender.avatar}
                          alt={request.sender.username}
                          className="rounded-circle me-2"
                          width="40"
                          height="40"
                        />
                        <div>
                          <div className="text-light fw-bold">{request.sender.username}</div>
                          <div className="text-muted small">
                            <span className={`badge ${request.sender.onlineStatus === 'online' ? 'bg-success' : 'bg-secondary'}`}>
                              {request.sender.onlineStatus}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="d-flex gap-2">
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => acceptRequest(request._id)}
                          disabled={processing.has(request._id)}
                        >
                          {processing.has(request._id) ? (
                            <span className="spinner-border spinner-border-sm"></span>
                          ) : (
                            <>
                              <i className="bi bi-check me-1"></i>
                              Accept
                            </>
                          )}
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => rejectRequest(request._id)}
                          disabled={processing.has(request._id)}
                        >
                          {processing.has(request._id) ? (
                            <span className="spinner-border spinner-border-sm"></span>
                          ) : (
                            <>
                              <i className="bi bi-x me-1"></i>
                              Reject
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Sent Requests */}
              {sentRequests.length > 0 && (
                <div>
                  <h6 className="text-warning mb-3">Sent Requests</h6>
                  {sentRequests.map((request) => (
                    <div key={request._id} className="d-flex align-items-center justify-content-between p-2 mb-2 bg-secondary rounded">
                      <div className="d-flex align-items-center">
                        <img
                          src={request.receiver.avatar}
                          alt={request.receiver.username}
                          className="rounded-circle me-2"
                          width="40"
                          height="40"
                        />
                        <div>
                          <div className="text-light fw-bold">{request.receiver.username}</div>
                          <div className="text-muted small">
                            <span className={`badge ${request.receiver.onlineStatus === 'online' ? 'bg-success' : 'bg-secondary'}`}>
                              {request.receiver.onlineStatus}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-muted small">
                        <i className="bi bi-clock me-1"></i>
                        Pending
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* No requests */}
              {receivedRequests.length === 0 && sentRequests.length === 0 && (
                <div className="text-center text-muted">
                  <i className="bi bi-inbox" style={{ fontSize: '2rem' }}></i>
                  <p className="mb-0 mt-2">No friend requests</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FriendRequests;
