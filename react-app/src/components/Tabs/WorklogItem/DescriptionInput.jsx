import { Editable, EditablePreview, EditableTextarea } from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";

const DescriptionInput = ({
  defaultValue,
  value,
  onChange,
  register,
  error,
}) => {
  const wrapperRef = useRef(null);
  const [height, setHeight] = useState(45);

  useEffect(() => {
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { height } = entry.contentRect;
        height > 0 && setHeight(height - 4);
      }
    });

    if (wrapperRef.current) {
      resizeObserver.observe(wrapperRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [wrapperRef.current]);

  return (
    <Editable
      color="blue.600"
      defaultValue={defaultValue}
      value={value}
      w="100%"
      fontSize="13px"
    >
      <div ref={wrapperRef}>
        <EditablePreview
          fontWeight={600}
          w="100%"
          cursor="pointer"
          border="1px solid transparent"
          lineHeight={1.35}
          minH="45px"
          borderColor={error ? "tomato" : "transparent"}
        />
      </div>
      <EditableTextarea
        h={`${height}px`}
        w="100%"
        fontWeight={600}
        flexGrow={1}
        flexShrink={0}
        register={register}
        onChange={onChange}
        minLength={1.1}
        fontSize="13px"
        lineHeight={1.35}
      />
    </Editable>
  );
};

export default DescriptionInput;
