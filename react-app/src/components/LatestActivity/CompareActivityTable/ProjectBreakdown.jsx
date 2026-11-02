import { Box, Table, Thead, Tbody, Tfoot, Tr, Th, Td, Text } from "@chakra-ui/react";
import { round } from "../../../helpers/getHours";

const DiffText = ({ value }) => {
  const diff = round(value);
  return (
    <Text as="span" fontWeight={600} color={diff === 0 ? "green.600" : "orange.500"}>
      {diff > 0 ? "+" : ""}
      {diff}h
    </Text>
  );
};

// Hours per project on each side. A row sets (or clears) the project filter.
const ProjectBreakdown = ({ rows, selected, onSelect }) => {
  if (rows.length === 0) return null;
  const total1 = rows.reduce((sum, row) => sum + row.hours1, 0);
  const total2 = rows.reduce((sum, row) => sum + row.hours2, 0);

  return (
    <Box mb={4} overflowX="auto">
      <Text fontSize="14px" fontWeight={600} mb={1}>
        By project
      </Text>
      <Table size="sm" variant="simple" aria-label="Hours by project">
        <Thead>
          <Tr>
            <Th fontSize="14px">Project</Th>
            <Th fontSize="14px" isNumeric>Source A</Th>
            <Th fontSize="14px" isNumeric>Source B</Th>
            <Th fontSize="14px" isNumeric>Difference (A − B)</Th>
          </Tr>
        </Thead>
        <Tbody>
          {rows.map((row) => {
            const active = selected === row.project;
            const select = () => onSelect(active ? null : row.project);
            return (
              <Tr
                key={row.project}
                role="button"
                tabIndex={0}
                aria-pressed={active}
                onClick={select}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    select();
                  }
                }}
                cursor="pointer"
                bg={active ? "blue.50" : undefined}
                _hover={{ bg: active ? "blue.100" : "rgba(0, 0, 0, 0.05)" }}
                _focusVisible={{ outline: "2px solid", outlineColor: "blue.500", outlineOffset: "-2px" }}
              >
                <Td fontSize="14px" fontWeight={active ? 700 : 500}>{row.project}</Td>
                <Td fontSize="14px" isNumeric>{round(row.hours1)}h</Td>
                <Td fontSize="14px" isNumeric>{round(row.hours2)}h</Td>
                <Td fontSize="14px" isNumeric><DiffText value={row.hours1 - row.hours2} /></Td>
              </Tr>
            );
          })}
        </Tbody>
        <Tfoot>
          <Tr bg="gray.100">
            <Td fontSize="14px" fontWeight="bold">Total</Td>
            <Td fontSize="14px" fontWeight="bold" isNumeric>{round(total1)}h</Td>
            <Td fontSize="14px" fontWeight="bold" isNumeric>{round(total2)}h</Td>
            <Td fontSize="14px" isNumeric><DiffText value={total1 - total2} /></Td>
          </Tr>
        </Tfoot>
      </Table>
    </Box>
  );
};

export default ProjectBreakdown;
