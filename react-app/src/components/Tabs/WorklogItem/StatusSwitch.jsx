import { Flex, FormLabel, Switch, Text } from "@chakra-ui/react";

const StatusSwitch = ({ value, onChange }) => {
  const isChecked = value === "blb";

  return (
    <Flex alignItems="center">
      <FormLabel htmlFor="email-alerts" mb="0" w="120px" m={0} fontWeight={400}>
        <Text as="strong" display="inline-block" mr="2px">
          Billability:
        </Text>{" "}
        {value}
      </FormLabel>

      <Switch
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
