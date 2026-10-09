import {
  Box,
  Button,
  Flex,
  Heading,
  Link,
  ListItem,
  OrderedList,
  Stack,
  Text,
} from "@chakra-ui/react";

import { openLoginPopup } from "../actions/auth";
import { isFirebaseConfigured } from "../firebase";
import { exitDemo, startDemo, useDemoStore } from "../demo/demoMode";

const README_URL = "https://github.com/Misyuk-T/worklog-hub#how-credentials-are-handled";

export const Welcome = () => (
  <Box
    as="section"
    aria-labelledby="welcome-title"
    w="100%"
    bg="white"
    borderWidth="1px"
    borderColor="gray.200"
    boxShadow="sm"
    p={{ base: 5, md: 8 }}
  >
    <Stack spacing={5} maxW="760px">
      <Heading id="welcome-title" as="h1" fontSize={{ base: "24px", md: "30px" }}>
        Log your hours once. Move them between Redmine, Jira and ClickUp.
      </Heading>
      <Text fontSize="16px" color="gray.700">
        Pull worklogs from one tracker, a Jira export or a plain text file,
        fix them up as cards, and submit them to another tracker. Compare
        shows where two trackers disagree for the same days.
      </Text>

      <OrderedList spacing={1} fontSize="16px" color="gray.700" pl={1}>
        <ListItem>Sign in with Google.</ListItem>
        <ListItem>Open Settings and paste the API keys for the trackers you use.</ListItem>
        <ListItem>Generate cards from a source, check them, submit.</ListItem>
      </OrderedList>

      <Flex gap={3} wrap="wrap">
        <Button colorScheme="teal" size="lg" borderRadius="0" onClick={startDemo}>
          Try the demo
        </Button>
        <Button
          size="lg"
          variant="outline"
          borderRadius="0"
          onClick={openLoginPopup}
          isDisabled={!isFirebaseConfigured}
        >
          Sign in with Google
        </Button>
      </Flex>

      <Text fontSize="14px" color="gray.600">
        The demo uses invented data and sends nothing anywhere.
        {!isFirebaseConfigured &&
          " Sign-in is off in this build because no Firebase config was provided."}{" "}
        Your API keys are saved in your own record in the app&apos;s Firebase
        database and passed to the proxy server with each request.{" "}
        <Link href={README_URL} isExternal color="blue.600" textDecoration="underline">
          How credentials are handled
        </Link>
      </Text>
    </Stack>
  </Box>
);

export const DemoBanner = () => {
  const isDemo = useDemoStore((state) => state.isDemo);
  if (!isDemo) return null;

  return (
    <Flex
      role="status"
      w="100%"
      bg="yellow.50"
      borderWidth="1px"
      borderColor="yellow.300"
      px={4}
      py={2}
      gap={3}
      align="center"
      justify="space-between"
      wrap="wrap"
    >
      <Text fontSize="14px" color="gray.800">
        <strong>Demo workspace.</strong> Invented worklogs from Jira, ClickUp
        and Redmine. Try Compare, edit the cards below, open Latest activity.
        Nothing is sent anywhere.
      </Text>
      <Button size="sm" variant="outline" borderRadius="0" onClick={exitDemo}>
        Exit demo
      </Button>
    </Flex>
  );
};
