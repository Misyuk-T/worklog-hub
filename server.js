const express = require("express");
const path = require("path");
const routes = require("./routes/routes");
const { cors } = require("./middlewares");

const app = express();

app.use(express.json());
app.use(cors);
app.use(routes);

app.use(express.static(path.join(__dirname, "./react-app/dist")));

app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "./react-app/dist", "index.html"));
});

const PORT = process.env.PORT || 8000;
const server = () =>
    app.listen(PORT, () => {
        console.log(`Server started on port ${PORT}`);
    });

module.exports = server;
