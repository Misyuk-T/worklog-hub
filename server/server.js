const express = require("express");
const routes = require("./routes/routes");
const { cors } = require("./middlewares");

const app = express();

app.use(express.json());
app.use(cors);
app.use(routes);

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}, Build 29/03/2025`));
