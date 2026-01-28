// File: app/utils/formatGraphForAI.js

export async function formatGraphForAI(graphId) {
  if (!graphId) throw new Error("No graph ID provided");

  // Fetch all graphs
  const graphRes = await fetch("/api/graphs");
  if (!graphRes.ok) throw new Error("Failed to fetch graphs");
  const allGraphs = await graphRes.json();
  const graph = allGraphs.find((g) => g.id === graphId);
  if (!graph) throw new Error("Graph not found");

  // Fetch volume data
  const volumeRes = await fetch("/api/volumeData");
  if (!volumeRes.ok) throw new Error("Volume data fetch failed");
  const allVolume = await volumeRes.json();

  const datasetIds = Array.isArray(graph.dataset_ids)
    ? graph.dataset_ids
    : [graph.dataset_ids];
  const matchingEntry = allVolume.find((v) => datasetIds.includes(v.id));
  if (!matchingEntry) throw new Error("No matching volume data");

  const volumeData = matchingEntry.data || {};
  const streamParts = matchingEntry.stream.split(",");
  const categoryId = streamParts.at(2);
  const regionId = streamParts.at(-2);

  // Fetch hierarchy
  const hierarchyRes = await fetch("/api/contentHierarchy");
  if (!hierarchyRes.ok) throw new Error("Hierarchy fetch failed");
  const nodes = await hierarchyRes.json();
  const findNodeName = (id) =>
    nodes.find((n) => n.id.toString() === id)?.name || "";
  const categoryName = findNodeName(categoryId);
  const region = findNodeName(regionId);

  // Category definition
  const defRes = await fetch(
    `/api/category-definition?categoryId=${categoryId}`
  );
  if (!defRes.ok) throw new Error("Category definition fetch failed");
  const { definition: categoryDefinition } = await defRes.json();

  // Questions
  const questionRes = await fetch(`/api/questions?graphId=${graphId}`);
  if (!questionRes.ok) throw new Error("Question fetch failed");
  const questions = await questionRes.json();
  const formattedQuestions = questions.map((q) => ({
    text: q.text,
    weight: q.weight,
    type: q.type,
  }));

  // Forecast years
  const scoreSettingsRes = await fetch("/api/scoreSettings");
  if (!scoreSettingsRes.ok) throw new Error("Score settings fetch failed");
  const scoreSettings = await scoreSettingsRes.json();
  const years = scoreSettings.yearNames || [];

  return {
    graphId,
    categoryName,
    categoryDefinition,
    graphName: graph.name,
    region,
    volumeData,
    years,
    questions: formattedQuestions,
  };
}
