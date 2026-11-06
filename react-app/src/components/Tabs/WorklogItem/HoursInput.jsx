import { useEffect, useState } from "react";
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

// Zero/empty text stays available while typing; save validation rejects it.
// Reject positive values below the field's minimum now that blur does not clamp.
const isAllowedCardHoursInput = (text) =>
  isAllowedHoursInput(text) && !(Number(text) > 0 && Number(text) < 0.1);

const HoursInput = ({ defaultValue, value, onChange, register }) => {
  // Always controlled, so a rejected keystroke or paste leaves the previous value in place.
  const [ownValue, setOwnValue] = useState(value ?? defaultValue ?? "");
  useEffect(() => {
    if (value !== undefined && value !== null) setOwnValue(value);
  }, [value]);
  const shown = String(ownValue);

  const handleChange = (next) => {
    if (!isAllowedCardHoursInput(next)) return;
    setOwnValue(next);
    const sameNumber = shown.trim() !== "" && next.trim() !== "" &&
      Number.isFinite(Number(shown)) && Number.isFinite(Number(next)) &&
      Number(shown) === Number(next);
    if (!sameNumber) onChange?.(next);
  };

  // react-hook-form also listens to the raw input event; keep it from seeing rejected text.
  const fieldRegister = register
    ? {
        ...register,
        onChange: (event) =>
          isAllowedCardHoursInput(event.target.value)
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
      clampValueOnBlur={false}
      allowMouseWheel
      isValidCharacter={isHoursCharacter}
      fontSize="16px"
      onChange={handleChange}
    >
      <NumberInputField
        h="25px"
        {...fieldRegister}
        onKeyDown={(event) => {
          if (event.key !== "Home" && event.key !== "End") return;
          event.preventDefault();
          const position = event.key === "Home" ? 0 : event.currentTarget.value.length;
          event.currentTarget.setSelectionRange(position, position);
        }}
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
