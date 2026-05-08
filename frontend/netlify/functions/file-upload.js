const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Parse the multipart form data
    const contentType = event.headers['content-type'];
    let file;
    let filename;
    let userId;

    // Handle multipart form data
    if (contentType && contentType.includes('multipart/form-data')) {
      const body = event.body;
      const boundary = contentType.split('boundary=')[1];
      const parts = body.split(boundary);
      
      for (const part of parts) {
        if (part.includes('Content-Disposition: form-data')) {
          const filenameMatch = part.match(/filename="([^"]*)"/);
          if (filenameMatch) {
            filename = filenameMatch[1];
          }
          
          // Extract file content
          const fileContentStart = part.indexOf('\r\n\r\n');
          const fileContent = part.substring(fileContentStart + 4);
          const fileContentEnd = fileContent.indexOf('\r\n--' + boundary);
          const actualFileContent = fileContent.substring(0, fileContentEnd);
          
          file = Buffer.from(actualFileContent, 'base64');
        }
        
        if (part.includes('userId')) {
          const userIdMatch = part.match(/userId=([^\\r\\n]*)/);
          if (userIdMatch) {
            userId = userIdMatch[1];
          }
        }
      }
    }

    if (!file || !userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'File and userId are required' })
      };
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = filename.split('.').pop();
    const uniqueFilename = `${timestamp}_${filename}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('uploads')
      .upload(uniqueFilename, file, {
        contentType: `image/${fileExtension}`,
        upsert: false
      });

    if (error) {
      console.error('Upload error:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to upload file' })
      };
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('uploads')
      .getPublicUrl(uniqueFilename);

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
      },
      body: JSON.stringify({
        success: true,
        fileUrl: publicUrl,
        filename: uniqueFilename,
        originalName: filename
      })
    };

  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
