const cors = require("cors");

const corsOptions = {
  optionsSuccessStatus: 200,
};

module.exports = cors(corsOptions);
