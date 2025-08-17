const { parentPort } = require('worker_threads');

// A helper to serialize error objects properly
function serializeError(error) {
  return {
    message: error.message,
    stack: error.stack,
    name: error.name,
  };
}

// Handle messages from the main thread
parentPort.on('message', async (message) => {
  try {
    // Process the message based on its type
    switch (message.type) {
      case 'process':
        const result = await processTask(message.data);
        parentPort.postMessage({ type: 'result', data: result });
        break;

      // Add a clean shutdown path
      case 'shutdown':
        parentPort.postMessage({ type: 'status', data: 'Worker shutting down.' });
        process.exit(0); // Exit gracefully
        break;
      
      default:
        parentPort.postMessage({ 
          type: 'error', 
          error: `Unknown message type: ${message.type}` 
        });
        break; // Added missing break
    }
  } catch (error) {
    // Send the full serialized error, not just the message
    parentPort.postMessage({ 
      type: 'error', 
      error: serializeError(error)
    });
  }
});

async function processTask(data) {
  // Your real task processing logic here
  // To test error handling, you could throw an error:
  // if (!data.id) {
  //   throw new Error("Task data must include an ID.");
  // }
  return {
    status: 'success',
    result: `Processed: ${JSON.stringify(data)}`
  };
}

// --- SAFE GLOBAL ERROR HANDLING ---
// These handlers will catch catastrophic errors, report them, and then exit.

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Post the message and then exit immediately.
  parentPort.postMessage({ 
    type: 'error', 
    error: serializeError(error)
  });
  process.exit(1); // Non-zero exit code indicates an error
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // It's good practice to treat unhandled rejections as fatal errors.
  const error = reason instanceof Error ? reason : new Error(String(reason));
  parentPort.postMessage({ 
    type: 'error', 
    error: serializeError(error)
  });
  process.exit(1);
});