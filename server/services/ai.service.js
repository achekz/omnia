import { predict } from "./mlService.js";
const { buildPrompt } = require("./promptBuilder");
async function askAI({ user, message, context }) {

    const prediction = await predict(context);

    if (prediction.risk_score > 70) {
        context.alert = "High risk detected";
    }

    const prompt = buildPrompt(user, message, context);

    const response = await axios.post("http://localhost:5000/ai", {
        prompt
    });

    return response.data.response;
}