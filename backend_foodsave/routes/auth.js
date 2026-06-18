// ...existing code...

// Handle preflight requests for login endpoint
router.options('/login', (req, res) => {
  res.status(200).end();
});

// ...existing code...