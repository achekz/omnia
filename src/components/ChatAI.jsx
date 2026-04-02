const sendMessage = async () => {
  const res = await axios.post("/api/ai/ask", {
    message: input
  });

  setMessages([...messages, res.data.response]);
};