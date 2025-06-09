const groupByField = (array, field) => {
  const groupedData = {};

  array.forEach((item) => {
    if (!groupedData[item[field]]) {
      groupedData[item[field]] = [];
      groupedData[item[field]].push(item);
    } else {
      groupedData[item[field]].push(item);
    }
  });

  return groupedData;
};

export default groupByField;
