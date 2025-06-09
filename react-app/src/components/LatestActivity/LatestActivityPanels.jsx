import React from "react";
import { Box } from "@chakra-ui/react";
import CompareActivityTable from "./CompareActivityTable/CompareActivityTable";
import useLatestActivityStore from "../../store/latestActivity";
import RedmineActivityTable from "./RedmineActiveTable/RedmineActiveTable";
import JiraActivityTable from "./JiraActiveTable/JiraActiveTable";

const LatestActivityPanels = () => {
  const { activeTab, panelSize } = useLatestActivityStore();

  return (
    <Box>
      {activeTab === "redmine" && (
        <RedmineActivityTable panelSize={panelSize} />
      )}
      {activeTab === "jira" && <JiraActivityTable panelSize={panelSize} />}
      {activeTab === "compare" && (
        <CompareActivityTable panelSize={panelSize} />
      )}
    </Box>
  );
};

export default LatestActivityPanels;
