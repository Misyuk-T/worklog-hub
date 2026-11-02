import { Box, Flex, Text } from "@chakra-ui/react";
import { round } from "../../../helpers/getHours";

const COLORS = { ok: "green.700", failed: "red.600", skipped: "orange.600" };

const describe = (item) => {
  if (item.status === "ok") {
    return `${round(item.hours || 0)}h (${item.count} ${item.count === 1 ? "entry" : "entries"})`;
  }
  if (item.status === "failed") return `failed: ${item.message}`;
  return `not read: ${item.message}`;
};

const Column = ({ title, name, items }) => (
  <Box flex="1" minW="260px">
    <Text fontSize="14px" fontWeight={600}>
      {title}
    </Text>
    {items.length === 0 && (
      <Text fontSize="14px" color="gray.600">
        No connection selected.
      </Text>
    )}
    {items.map((item) => (
      <Box key={item.label}>
        <Text fontSize="14px" color={COLORS[item.status]}>
          {item.label} — {describe(item)}
        </Text>
        {item.note && (
          <Text fontSize="14px" color="gray.700">
            {item.note}
          </Text>
        )}
      </Box>
    ))}
    {items.length > 0 && (
      <Text fontSize="14px" fontWeight={600} mt={1}>
        {name} total: {round(items.reduce((sum, item) => sum + (item.hours || 0), 0))}h
      </Text>
    )}
  </Box>
);

// Which connections each side was built from, and which of them failed.
const SourceSummary = ({ source1Label, source1Info, source2Label, source2Info }) => (
  <Flex
    gap={4}
    mb={4}
    p={3}
    wrap="wrap"
    borderWidth="1px"
    borderColor="gray.200"
    bg="gray.50"
    aria-label="Connections used"
  >
    <Column title={`Source A: ${source1Label || "none"}`} name="Source A" items={source1Info} />
    <Column title={`Source B: ${source2Label || "none"}`} name="Source B" items={source2Info} />
  </Flex>
);

export default SourceSummary;
