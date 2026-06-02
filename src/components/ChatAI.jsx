// Role du fichier: fournit un composant React reutilisable.
const sendMessage = async () => {
  const res = await axios.post("/api/ai/chat", {
    message: input
  }, { timeout: 30000 });

  setMessages([...messages, res.data.reply]);
};
