import { useState } from "react";
import {
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
} from "@chakra-ui/react";
import {
  MAX_HOURS,
  isAllowedHoursInput,
  isHoursCharacter,
} from "../../../helpers/hoursInput";

const HoursInput = ({ defaultValue, value, onChange, register }) => {
  // Always controlled, so a rejected keystroke or paste leaves the previous value in place.
  const [ownValue, setOwnValue] = useState(defaultValue ?? "");
  const current = value ?? ownValue;
  const shown = current === null || current === undefined ? "" : String(current);

  const handleChange = (next) => {
    if (!isAllowedHoursInput(next)) return;
    setOwnValue(next);
    onChange?.(next);
  };

  // react-hook-form also listens to the raw input event; keep it from seeing rejected text.
  const fieldRegister = register
    ? {
        ...register,
        onChange: (event) =>
          isAllowedHoursInput(event.target.value)
            ? register.onChange?.(event)
            : undefined,
      }
    : {};

  return (
    <NumberInput
      value={shown}
      w="70px"
      min={0.1}
      max={MAX_HOURS}
      step={0.25}
      keepWithinRange
      allowMouseWheel
      isValidCharacter={isHoursCharacter}
      fontSize="16px"
      onChange={handleChange}
    >
      <NumberInputField
        h="25px"
        {...fieldRegister}
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
