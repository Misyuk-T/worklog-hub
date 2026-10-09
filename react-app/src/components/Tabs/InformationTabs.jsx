import { useState, useEffect } from "react";
import { addDays, format } from "date-fns";
import { Button, Tab, TabList, TabPanels, Tabs, Box } from "@chakra-ui/react";
import { AddIcon } from "@chakra-ui/icons";

import useWorkLogsStore from "../../store/worklogsStore";
import { getCorrectGMTDateObject } from "../../helpers/getFormattedDate";

import TotalInformationTab from "./TotalInformationTab/TotalnformationTab";
import TabItem from "./TabItem";
import BoxOverlay from "../BoxOverlay";

import styles from "./InformationTabs.module.scss";
import useJiraStore from "../../store/jiraStore";
import { normalizeServiceScope } from "../../helpers/matchWorklogTasks";

const getSortedByDate = (data) =>
  data.sort((a, b) => {
    const dateA = new Date(a[0].split("-").reverse().join("-"));
    const dateB = new Date(b[0].split("-").reverse().join("-"));
    return dateA - dateB;
  });

const InformationTabs = () => {
  const { workLogs, addWorkLog, setIsJiraExport } = useWorkLogsStore();
  const { organizationURL } = useJiraStore();
  const [selectedTabIndex, setSelectedTabIndex] = useState(0);

  const workLogsArray = workLogs ? Object.entries(workLogs) : [];
  const sortedArray =
    workLogsArray.length > 0 ? getSortedByDate(workLogsArray) : workLogsArray;
  const lastDate = workLogsArray.length
    ? addDays(
        getCorrectGMTDateObject(workLogsArray[workLogsArray.length - 1][0]),
        1,
      )
    : new Date();
  const formattedLastDate = format(lastDate, "dd-MM-yyyy");

  const truncatedOrganizationURL = normalizeServiceScope(organizationURL);

  const handleAddWorkLog = () => {
    addWorkLog(formattedLastDate, {
      date: formattedLastDate,
      description: "New task",
      hours: 0.25,
      blb: "nblb",
      project: "",
      task: "",
      jiraUrl: truncatedOrganizationURL,
    });
    setIsJiraExport(false);
  };

  useEffect(() => {
    setSelectedTabIndex((index) => Math.min(index, workLogsArray.length));
  }, [workLogsArray.length]);

  return (
    <Box w="100%" minW={0} position="relative">
      <Tabs
        position="relative"
        className={styles.informationTabs}
        variant="enclosed"
        isFitted
        onChange={setSelectedTabIndex}
        index={selectedTabIndex}
      >
        <TabList
          className={styles.tabsList}
          overflowX="auto"
          overflowY="hidden"
        >
          <Tab
            minW="130px"
            className={styles.tabItem}
            bgColor="blackAlpha.50"
            fontWeight={600}
          >
            Total
          </Tab>

          {sortedArray.map(([date]) => {
            const [month, day] = date.split("-");

            return (
              <Tab
                key={date}
                className={styles.tabItem}
                bgColor="blackAlpha.50"
                fontWeight={600}
                minW="90px"
              >
                {`${month}-${day}`}
              </Tab>
            );
          })}

          <Button
            bgColor="blackAlpha.50"
            fontWeight={600}
            borderBottomRadius={0}
            borderBottom="1px solid"
            borderColor="transparent"
            height="auto"
            onClick={handleAddWorkLog}
            aria-label="Add day"
            flexShrink={0}
            w="40px"
            mb="-1px"
            _hover={{
              borderColor: "transparent",
            }}
          >
            <AddIcon />
          </Button>
        </TabList>

        <TabPanels position="relative" w="100%" overflowX="auto">
          <TotalInformationTab data={workLogsArray} />

          {sortedArray.map(([date, logs]) => {
            return <TabItem key={date} dayLogs={logs} date={date} />;
          })}
        </TabPanels>
      </Tabs>
      <BoxOverlay
        bgColor="blackAlpha.50"
        height="calc(100% - 41px)"
        top="41px"
        borderTop="1px solid"
        borderColor="#b7aeae"
      />
    </Box>
  );
};

export default InformationTabs;
