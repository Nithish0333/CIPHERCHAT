import React from 'react';

const DemoCredentials = () => {
  return (
    <div className="alert alert-info mt-3" role="alert">
      <h6 className="alert-heading">
        <i className="bi bi-info-circle me-2"></i>
        Demo Credentials
      </h6>
      <p className="mb-2 small">
        This is a portfolio demo. Use the following credentials to explore the application:
      </p>
      <div className="row">
        <div className="col-md-6">
          <strong>Username:</strong> <code>Testuser1</code>
        </div>
        <div className="col-md-6">
          <strong>Password:</strong> <code>Testuser1</code>
        </div>
      </div>
      <hr />
      <p className="mb-0 small text-muted">
        <i className="bi bi-lightbulb me-1"></i>
        <strong>Note:</strong> This is a demonstration version for portfolio purposes. 
        Some features may be limited in the demo environment.
      </p>
    </div>
  );
};

export default DemoCredentials;
