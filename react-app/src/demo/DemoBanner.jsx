import { Button, Flex, Text } from "@chakra-ui/react";

export const SOURCE_URL = "https://github.com/Misyuk-T/worklog-hub";

export const SourceLink = (props) => (
  <Button
    as="a"
    href={SOURCE_URL}
    target="_blank"
    rel="noopener noreferrer"
    borderRadius="0"
    {...props}
  >
    Source on GitHub
  </Button>
);

// Shown only in the demo build (VITE_DEMO=true). See demoMode.js.
export const DemoBanner = () => (
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
      <strong>Demo workspace.</strong> Invented worklogs from Jira, ClickUp and
      Redmine. Try Compare, edit the cards below, open Latest activity. Nothing
      is sent anywhere.
    </Text>
    <SourceLink size="sm" variant="outline" />
  </Flex>
);
