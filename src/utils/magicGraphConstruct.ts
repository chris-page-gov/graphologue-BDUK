import dagre from 'dagre'
import { v4 as uuidv4 } from 'uuid'

import { hardcodedNodeWidthEstimation } from '../components/Node'
import { hardcodedNodeSize } from '../constants'

import { getOpenAICompletion } from './openAI'
import {
  predefinedPrompts,
  predefinedResponses,
  promptTerms,
} from './promptsAndResponses'

const rawRelationsToGraphRelations = (rawRelationsText: string): string[][] => {
  // preprocess the response
  const textRelationshipsArray: string[][] = rawRelationsText
    .split(promptTerms.itemBreaker)
    .map((item: string) => {
      item = item.trim()

      const triplet: string[] = item
        .split(promptTerms.itemRelationshipConnector)
        .map(i => i.trim())

      if (triplet.length !== 3) return []

      // ! process the edge label
      // make the edge the lower case
      triplet[1] = triplet[1].toLowerCase()
      // avoid underscore
      triplet[1] = triplet[1].replace(/_/g, ' ')
      // ? [experimental] remove is, was, are, were, etc.
      // TODO optimize?
      triplet[1] = triplet[1].replace(
        /(?:^|\s)(is|was|are|were|has|have|had|does|do|did|a|an|the)(?=\s|$)/g,
        ''
      )

      // ! process everything
      // trim
      triplet.forEach((t, ind) => (triplet[ind] = t.trim()))
      // remove line breaks, and other special characters, like semi-colon
      triplet.forEach(
        (t, ind) => (triplet[ind] = t.replace(/[^a-zA-Z0-9 ,.!?&()]+/g, ''))
      )

      // ! process the subject
      // remove the 's
      triplet[0] = triplet[0].replace(/'s/g, '')
      // remove comma from the start and end
      triplet[0] = triplet[0].replace(/^,|,$/g, '')

      return triplet
    })
    .filter((item: string[]) => item.length === 3)

  // ! post processing
  ////
  const expandedRelationshipsArray: string[][] = []
  const recurrentSubjectEdgePairs: {
    [key: string]: {
      count: number
      expanded: boolean
      expandHiddenId: string
    }
  } = {}
  textRelationshipsArray.map(item => {
    // do this only for non empty items
    if (item[1].length) {
      const key = `${item[0]}${promptTerms.itemRelationshipConnector}${item[1]}`
      if (recurrentSubjectEdgePairs[key]) recurrentSubjectEdgePairs[key].count++
      else
        recurrentSubjectEdgePairs[key] = {
          count: 1,
          expanded: false,
          expandHiddenId: uuidv4(),
        }
    }
    return item
  })
  textRelationshipsArray.forEach(item => {
    if (item[1].length === 0) expandedRelationshipsArray.push(item)
    else {
      const thisSubjectEdgePair = `${item[0]}${promptTerms.itemRelationshipConnector}${item[1]}`
      if (recurrentSubjectEdgePairs[thisSubjectEdgePair].count >= 2) {
        // ! need to expand
        const expandedEdgeItem = wrapWithHiddenExpandId(
          item[1],
          recurrentSubjectEdgePairs[thisSubjectEdgePair].expandHiddenId
        )

        if (!recurrentSubjectEdgePairs[thisSubjectEdgePair].expanded) {
          // not expanded yet
          expandedRelationshipsArray.push([item[0], '', expandedEdgeItem])
          recurrentSubjectEdgePairs[thisSubjectEdgePair].expanded = true
        }

        expandedRelationshipsArray.push([expandedEdgeItem, '', item[2]])
        ////
      } else expandedRelationshipsArray.push(item)
    }
  })

  ////
  const finalRelationshipsArray: string[][] = []
  expandedRelationshipsArray.forEach(item => {
    // split comma separated items
    if (item[2].includes(','))
      item[2].split(',').forEach(i => {
        finalRelationshipsArray.push([item[0], item[1], i.trim()])
      })
    else finalRelationshipsArray.push(item)
  })

  console.log(finalRelationshipsArray) // TODO remove
  return finalRelationshipsArray
}

export const constructGraphRelationsFromResponse = async (
  response: string
): Promise<string[][]> => {
  if (
    response.length === 0 ||
    response === predefinedResponses.modelDown() ||
    response === predefinedResponses.noValidModelText() ||
    response === predefinedResponses.noValidResponse()
  )
    return []

  const textRelationships = await getOpenAICompletion(
    predefinedPrompts.textToGraph(response)
  )

  if (textRelationships.error) {
    console.error(textRelationships.error)
    return []
  }

  const textRelationshipsText = textRelationships.choices[0].text
  if (textRelationshipsText.length === 0) return []

  return rawRelationsToGraphRelations(textRelationshipsText)
}

// ? why - what if there are two 'contains' from two subjects?
const wrapWithHiddenExpandId = (text: string, id: string) => {
  return `${text}____${id}____`
}

export const removeHiddenExpandId = (text: string) => {
  return text.replace(/____.*?____/g, '')
}

export const hasHiddenExpandId = (text: string) => {
  return text.includes('____')
}

/* -------------------------------------------------------------------------- */

export const constructGraph = (relationships: string[][]) => {
  // https://github.com/dagrejs/dagre/wiki#an-example-layout
  var pseudoGraph = new dagre.graphlib.Graph()
  pseudoGraph.setGraph({
    rankdir: 'LR',
    // align: 'UL',
    ranksep: 100,
    nodesep: 30,
  })
  pseudoGraph.setDefaultEdgeLabel(function () {
    return ''
  })

  const addedNode = new Set()
  relationships.forEach(([a, edge, b]: string[]) => {
    if (!addedNode.has(a)) {
      pseudoGraph.setNode(a, {
        label: a,
        width: hardcodedNodeWidthEstimation(removeHiddenExpandId(a)),
        height: hardcodedNodeSize.height,
      })
      addedNode.add(a)
    }

    if (!addedNode.has(b)) {
      pseudoGraph.setNode(b, {
        label: b,
        width: hardcodedNodeWidthEstimation(removeHiddenExpandId(b)),
        height: hardcodedNodeSize.height,
      })
      addedNode.add(b)
    }

    pseudoGraph.setEdge(a, b, { label: edge })
  })

  // ! compute
  dagre.layout(pseudoGraph)

  // print the graph
  const nodes: {
    label: string
    x: number
    y: number
  }[] = []
  pseudoGraph.nodes().forEach(v => {
    nodes.push({
      label: pseudoGraph.node(v).label as string,
      x: pseudoGraph.node(v).x,
      y: pseudoGraph.node(v).y,
    })
  })

  return nodes
}