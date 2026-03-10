import { Flex, FormLabel, Switch, Text } from "@chakra-ui/react";

const StatusSwitch = ({ value, onChange }) => {
  const isChecked = value === "blb";

  return (
    <Flex alignItems="center">
      <FormLabel htmlFor="billability-switch" mb="0" m={0} fontWeight={400} fontSize="sm">
        <Text as="strong" display="inline-block" mr="2px">
          Billability:
        </Text>{" "}
        {value}
      </FormLabel>

      <Switch
        id="billability-switch"
        size="sm"
        isChecked={isChecked}
        onChange={(e) => {
          const isChecked = e.target.checked ? "blb" : "nblb";
          onChange(isChecked);
        }}
      />
    </Flex>
  );
};

export default StatusSwitch;
