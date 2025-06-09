import { forwardRef } from "react";
import {
  Box,
  Flex,
  IconButton,
  SimpleGrid,
  TabPanel,
  Text,
} from "@chakra-ui/react";
import { AddIcon } from "@chakra-ui/icons";

import useWorkLogsStore from "../../store/worklogsStore";

import WorkLogItem from "./WorklogItem/WorkLogItem";
import { getHours, round } from "../../helpers/getHours";
import useJiraStore from "../../store/jiraStore";

const TabItem = forwardRef(({ dayLogs, date }, ref) => {
  const { addWorkLog } = useWorkLogsStore();
  const { organizationURL } = useJiraStore();
  const { totalHours, blbHours, nblbHours } = getHours(dayLogs);
  const totalTextColor =
    totalHours === 8
      ? "green"
      : totalHours > 8 || totalHours < 0
      ? "red"
      : "orange";

  const truncatedOrganizationURL = organizationURL?.slice(
    8,
    organizationURL?.length
  );

  const handleCreate = () => {
    addWorkLog(date, {
      date,
      description: "New task",
      hours: 0.25,
      blb: "nblb",
      project: "",
      task: "",
      jiraUrl: truncatedOrganizationURL,
    });
  };

  return (
    <TabPanel px={0} position="relative" pb="50px" overflowY="hidden">
      <Box left={0} w="100%" maxW="1155px" ref={ref}>
        <Flex gap={5}>
          <Text color={totalTextColor}>
            <Text as="span" fontWeight={700} color="black">
              Total time:{" "}
            </Text>
            {totalHours}h
          </Text>
          <Text>
            <strong>blb: </strong>
            {round(blbHours)}h
          </Text>
          <Text>
            <strong>nblb: </strong>
            {round(nblbHours)}h
          </Text>
        </Flex>
        <SimpleGrid
          minChildWidth={300}
          gap={"20px"}
          mt={15}
          templateColumns="repeat(auto-fit, minmax(300px, 354px))"
        >
          {dayLogs.map((item, index) => {
            return <WorkLogItem data={item} key={item.description + index} />;
          })}

          <Flex alignItems="center" justifyContent="center" minH="200px">
            <IconButton
              onClick={handleCreate}
              bg="teal.600"
              w={70}
              h={70}
              boxShadow="dark-lg"
              borderRadius="50%"
              aria-label="add more"
              _hover={{
                bg: "teal.500",
              }}
            >
              <AddIcon color="white" w={5} h={5} size="large" />
            </IconButton>
          </Flex>
        </SimpleGrid>
      </Box>
    </TabPanel>
  );
});

export default TabItem;
