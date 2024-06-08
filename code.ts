

figma.showUI(__html__, { width: 400, height: 480 });


let existingCollections;
async function getLocalCollections() {
  try {
    existingCollections = await figma.variables.getLocalVariableCollectionsAsync();
    if (existingCollections.length > 0) {
      const collectionSets = existingCollections.map((localCollection) => ({
        name: localCollection.name,
        id: localCollection.id,
      }));

      figma.ui.postMessage({
        type: "render-collections",
        collectionSets
      })
    } else {
      figma.ui.postMessage({
        type: "render-error-message"
      })
    }
  } catch (error) {
    console.error("Error fetching collections: ", error);
    figma.closePlugin();
  }
}

getLocalCollections();


figma.ui.onmessage = async msg => {

  if (msg.type === 'create-code-snippets') {
    const collection = await getCollection(msg.collectionId);
    const allVariables = collection?.variableIds;



    if (allVariables) {
      for (const variableId of allVariables) {
        const variable = await figma.variables.getVariableByIdAsync(variableId);

        if (!variable) {
          console.error(`Variable with ID ${variableId} is not found.`);
          continue;
        }

        const existingCodeSyntax = variable.codeSyntax;
        const platformSyntax = existingCodeSyntax ? existingCodeSyntax[msg.selectedPlatform] : undefined;

        const matchValue = msg.matchValue.replace("%*", variable.name || '');
        const renameValue = msg.renameValue.replace("%*", variable.name || '');

        let token;

        if (platformSyntax && matchValue) {

          const escapedMatchValue = matchValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(escapedMatchValue, 'g');

          const updatedPlatformSyntax = platformSyntax.replace(regex, renameValue);
          token = updatedPlatformSyntax;
        } else if (matchValue) {
          const escapedMatchValue = matchValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(escapedMatchValue, 'g');
          const newSyntax = renameValue.replace(regex, renameValue);
          token = newSyntax;
        } else {
          token = renameValue;
        }


        variable.setVariableCodeSyntax(msg.selectedPlatform, token);


      }

      figma.notify("Done!")
    }



  }
}
async function getCollection(collectionId: string): Promise<VariableCollection | null> {
  let collection: VariableCollection | null = null;

  if (collectionId) {
    try {
      collection = await figma.variables.getVariableCollectionByIdAsync(collectionId);

      if (!collection) {
        collection = figma.variables.createVariableCollection(collectionId);
      }
    } catch (error) {
      console.error("Error accessing or creating the collection: ", error);
      figma.closePlugin();
      return null;
    }
  }
  return collection;
}