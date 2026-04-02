router.post("/ask", authMiddleware, async (req, res) => {
    const user = req.user;
    const message = req.body.message;

    const context = await getContext(user);

    const response = await askAI({
        user,
        message,
        context
    });

    res.json({ response });
});