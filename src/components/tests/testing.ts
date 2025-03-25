export default [
    // nodes
    { data: { id: "Assigned", label: "Assigned" }, selectable: true },
    { data: { id: "Created", label: "Created" }, selectable: true },
    { data: { id: "Started", label: "Started" }, selectable: true },
    { data: { id: "On Hold", label: "On Hold" }, selectable: true },
    { data: { id: "Completed", label: "Completed" }, selectable: true },
    { data: { id: "Approved", label: "Approved" }, selectable: true },
    // edges
    {
      data: { id: "a1", source: "Created", target: "Assigned", label: "assign" },
    },
    { data: { id: "a2", source: "Assigned", target: "Started", label: "start" } },
    { data: { id: "a3", source: "On Hold", target: "Started", label: "start" } },
    { data: { id: "a4", source: "Started", target: "On Hold", label: "hold" } },
    {
      data: {
        id: "a5",
        source: "Started",
        target: "Completed",
        label: "complete",
      },
    },
    {
      data: {
        id: "a6",
        source: "Completed",
        target: "Approved",
        label: "approve",
      },
    },
  ];
  