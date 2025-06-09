import {
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
} from "@chakra-ui/react";

const HoursInput = ({ defaultValue, value, onChange, register }) => {
  return (
    <NumberInput
      defaultValue={defaultValue}
      value={value}
      w="70px"
      min={0.1}
      max={8}
      step={0.25}
      keepWithinRange
      allowMouseWheel
      fontSize="16px"
      onChange={(value) => {
        onChange(value);
      }}
    >
      <NumberInputField
        h="25px"
        register={register}
        cursor="pointer"
        border="none"
        pl="5px"
        outlineOffset={0}
        mb="1px"
        _focus={{
          opacity: "1",
          "& ~ div": {
            opacity: 1,
          },
        }}
      />

      <NumberInputStepper opacity="0" transition="opacity 0.2s">
        <NumberIncrementStepper />
        <NumberDecrementStepper />
      </NumberInputStepper>
    </NumberInput>
  );
};

export default HoursInput;
