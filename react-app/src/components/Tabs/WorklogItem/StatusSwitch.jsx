import { Flex, Switch, Text } from "@chakra-ui/react";

const StatusSwitch = ({ value, onChange }) => {
  const isChecked = value === "blb";

  return (
    <Flex alignItems="center" gap={2} py={2}>
      <Text fontSize="sm" fontWeight="600">
        Billability:
      </Text>
      <Switch
        id="billability-switch"
        size="sm"
        isChecked={isChecked}
        onChange={(e) => {
          const isChecked = e.target.checked ? "blb" : "nblb";
          onChange(isChecked);
        }}
      />
      <Text fontSize="sm" fontWeight={500} minW="35px">
        {value}
      </Text>
    </Flex>
  );
};

export default StatusSwitch;
