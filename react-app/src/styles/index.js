import { extendTheme } from "@chakra-ui/react";

import "@fontsource/raleway/latin.css";
import "@fontsource/open-sans/latin.css";

import "react-day-picker/dist/style.css";
import "react-toastify/dist/ReactToastify.css";

const theme = extendTheme({
  fonts: {
    heading: '"Raleway", sans-serif',
  },
  body: {
    fontFamily: "Open sans",
  },
  styles: {
    global: {
      html: {
        display: "flex",
        flexDirection: "column",
        minHeight: "100%",
        overflowY: "scroll",

        body: {
          display: "flex",
          flex: "1 0 auto",
          overflowX: "hidden",
          height: "100%",
          marginRight: "0 !important",
        },
      },

      "#root": {
        flex: "1 0 auto",
      },

      "*::-webkit-scrollbar": {
        width: "10px",
      },

      "*::-webkit-scrollbar-track": {
        background: "transparent",
        border: "1px solid",
        borderColor: "var(--chakra-colors-gray-300)",
        borderRadius: 5,
      },

      "*::-webkit-scrollbar-thumb": {
        background: "var(--chakra-colors-gray-500)",
        borderRadius: 5,
      },

      ".Toastify__toast-container": {
        width: "450px",
      },
    },
  },
});

export default theme;
