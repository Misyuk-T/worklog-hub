const getProjectName = (id, projects) => {
  return projects?.filter((item) => item.id === id)[0]?.projectName;
};

export default getProjectName;
