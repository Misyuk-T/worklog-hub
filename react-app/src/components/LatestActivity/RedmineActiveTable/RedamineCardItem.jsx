import { Text, Stack, Flex, Box, LinkOverlay, LinkBox } from "@chakra-ui/react";

import useRedmineStore from "../../../store/redmineStore";
import { round } from "../../../helpers/getHours";

const RedmineCardItem = ({ activities, fontSize }) => {
  const { projects } = useRedmineStore();

  return (
    <Box mb={5}>
      {activities.map((activity) => {
        const projectId = activity?.issue?.id || {}
        const project = projects.find((item) => item.id === projectId);
        const blb = activity.custom_fields[0].value === "3" ? "nblb" : "blb";

        return (
          <LinkBox key={activity.id}>
            <Stack
              gap={0}
              _hover={{
                background: "gray.100",
              }}
            >
              <Flex gap={1}>
                <LinkOverlay
                  href={`https://redmine.anyforsoft.com/time_entries/${activity.id}/edit`}
                  target="_blank"
                  fontSize={fontSize}
                  fontWeight={700}
                >
                  {project ? project.projectName : "Untracked project"}
                </LinkOverlay>
                {project && <Text fontSize={fontSize}>{project.subject}</Text>}

                <Text
                  fontSize={fontSize}
                  fontWeight={500}
                  color={blb === "blb" ? "green" : "orange"}
                >
                  ({blb})
                </Text>

                <Text as="strong" fontSize={fontSize}>
                  {round(activity.hours)}h
                </Text>
              </Flex>
              <Text fontSize={fontSize}>{activity.comments}</Text>
            </Stack>
          </LinkBox>
        );
      })}
    </Box>
  );
};

export default RedmineCardItem;
