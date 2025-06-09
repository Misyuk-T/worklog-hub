import { Text, Flex, LinkOverlay, LinkBox, Box } from "@chakra-ui/react";

import useRedmineStore from "../store/redmineStore";
import useJiraStore from "../store/jiraStore";

const ServicesStatus = ({ title, user }) => {
  const { organizationURL } = useRedmineStore();
  const { organizationURL: jiraUrl } = useJiraStore();

  const isJiraUser = title === "jira";
  const userName = isJiraUser
    ? user?.displayName
    : `${user?.firstname} ${user?.lastname}`;
  const avatarUrl = isJiraUser ? jiraUrl : organizationURL;

  return (
    <Flex
      as={LinkBox}
      gap={1}
      px={"8px"}
      w="100%"
      alignItems="center"
      justifyContent="center"
      pointerEvents={avatarUrl ? "auto" : "none"}
    >
      <Flex w="50%" alignItems="center" gap="5px">
        <Box w={2} h={2} bg={user ? "green" : "red"} borderRadius="50%" />

        <LinkOverlay
          fontSize="12px"
          textAlign="center"
          href={avatarUrl}
          textTransform="capitalize"
          target="_blank"
          _hover={{
            textDecoration: "underline",
          }}
          fontWeight="500"
        >
          {title}:
        </LinkOverlay>
      </Flex>

      <Text
        w="50%"
        fontSize="xs"
        fontWeight={700}
        textAlign="center"
        noOfLines={1}
      >
        {user ? userName : "Not connected"}
      </Text>
    </Flex>
  );
};

export default ServicesStatus;
