import { PRODUCT_NAME } from "@/shared/brand"

/** English UI texts. Keep the shape identical to `messages.no.ts`. */
export const messagesEn = {
  common: {
    example: "Example",
    cancel: "Cancel",
    confirm: "Confirm",
    close: "Close",
  },
  errorBoundary: {
    title: "Something went wrong",
    body: "The page could not be shown. Try again, or reload the page.",
    tryAgain: "Try again",
    reload: "Reload the page",
  },
  buttons: {
    runSimulation: "Run simulation",
    simulating: "Simulating…",
  },
  sections: {
    costElements: "Cost items",
    drivers: "Cost drivers",
  },
  expanders: {
    costElements: "Cost items",
    drivers: "Cost drivers",
    driverImpact: "Impact",
    costCorrelation: "Correlation",
    define: "Define",
    guidedInput: "Focus mode",
  },
  projectProfile: {
    heading: "Project profile",
    collapsedEmptyHint: "Describe the project",
    focusIntro:
      "Choose the options that best describe the project. The profile provides context for the analysis and documents the project basis.",
    sizeHeading: "Size",
    categories: {
      projectArea: "Project area",
      projectType: "Project type",
      interventionTypes: "Intervention type",
      phase: "Primary stage at analysis",
      deliveryModel: "Delivery model",
    },
    options: {
      buildings: "Buildings",
      transport: "Transport",
      energy: "Energy",
      water_wastewater: "Water and wastewater",
      industry: "Industry",
      other: "Other",
      education: "Education",
      healthcare: "Healthcare",
      office: "Office",
      culture_sports: "Culture and sports",
      emergency_defence: "Emergency and defence",
      residential: "Residential",
      road: "Road",
      rail: "Rail",
      tunnel: "Tunnel",
      bridge: "Bridge",
      transport_hub: "Transport hub",
      generation: "Generation",
      grid_transmission: "Grid and transmission",
      substation_transformer: "Substation / transformer",
      energy_storage: "Energy storage",
      water_supply: "Water supply",
      wastewater: "Wastewater",
      pipeline_network: "Pipeline network",
      treatment_plant: "Treatment plant",
      pumping_station: "Pumping station",
      production_facility: "Production facility",
      process_plant: "Process plant",
      warehouse_logistics: "Warehouse and logistics",
      technical_infrastructure: "Technical infrastructure",
      new_facility: "New facility",
      expansion: "Expansion",
      rehabilitation_renewal: "Rehabilitation / renewal",
      modification: "Modification",
      combined: "Combined",
      study: "Study",
      concept: "Concept",
      preliminary_design: "Preliminary design",
      detailed_design: "Detailed design",
      execution: "Execution",
      handover: "Handover",
      not_contracted: "Not decided",
      design_bid_build: "Design-bid-build",
      design_build: "Design-build",
      partnering: "Partnering",
      multiple_contracts: "Multiple / split contracts",
    },
    quantityTypes: {
      gross_floor_area: "Gross floor area",
      length: "Length",
      tunnel_length: "Tunnel length",
      bridge_length: "Bridge length",
      capacity: "Capacity",
    },
    quantityUnits: {
      m2: "m²",
      km: "km",
      m: "m",
      mw: "MW",
    },
    changeWillClearLater: "This change will remove all later selections in the project profile.",
    changeWillClearLaterHint: "You can select them again afterwards.",
    confirmChange: "Change",
  },
  helper: {
    resultsKeyMetrics:
      "Summarizes the simulated cost distribution. Percentiles show the cost level that the stated share of simulations falls below.",
    resultsWaterfallFootnote:
      "Shows how expected addition is built from base cost to P50, distributed across cost items and drivers.",
  },
  charts: {
    sCurveAriaLabel: "S-curve of the simulation results",
    noContributions: "No contributions to display.",
    axisY: "P",
    axisX: "C",
    sCurveTitle: "S-CURVE",
    sCurveSubtitle:
      "Shows the probability that total cost will be below a given level. Greater horizontal spread means greater uncertainty in the cost outcome.",
    attributionTitle: "CONTRIBUTION ANALYSIS",
    attributionSubtitle:
      "Shows how cost items and drivers contribute to the expected addition and uncertainty reserve. Larger contributions mean greater impact on the relevant result.",
    waterfallTitle: "CONTRIBUTIONS TO EXPECTED ADDITION",
    waterfallSubtitle:
      "Shows what builds up the expected addition (P50 minus base cost), distributed across cost items and drivers.",
    reserveWaterfallTitle: "CONTRIBUTIONS TO UNCERTAINTY RESERVE",
    reserveWaterfallSubtitle:
      "Shows what builds up the uncertainty reserve (P85 minus P50), distributed across cost items and drivers.",
    tornadoTitle: "TORNADO",
    tornadoSubtitle:
      "Shows which uncertainties have the greatest impact on the cost result. Longer bars mean greater impact.",
    openLargerView: "Open larger view",
    closeLargerView: "Close larger view",
  },
  results: {
    resultsHeading: "Results",
    keyMetricsTitle: "KEY FIGURES",
    downloadPdf: "Download PDF",
    pdfReportTitle: "Uncertainty analysis",
    pdfOngoingReportKindLabel: "Ongoing uncertainty analysis",
    pdfOngoingCheckpointOverviewTitle: "Checkpoint overview",
    pdfOngoingDevelopmentTitle: "Development",
    pdfOngoingLatestSummaryTitle: "Latest archived checkpoint",
    pdfOngoingCurrentStatusTitle: "Current status",
    pdfOngoingChangeTitle: "Change since previous checkpoint",
    pdfOngoingComparisonTitle: "Comparison with previous checkpoint",
    pdfOngoingHistoryTitle: "Checkpoint history",
    pdfOngoingAssumptionsMethodTitle: "Assumptions / method",
    pdfOngoingAssumptionsTitle: "Assumptions",
    pdfOngoingMethodTitle: "About the analysis method",
    pdfOngoingReportBasisArchivedOnly:
      "Report basis: Archived checkpoints up to and including {cutoffLabel}.",
    pdfOngoingReportBasisWithExcludedDraft:
      "Report basis: Archived checkpoints up to and including {cutoffLabel}. {draftLabel} is active and is not included in the report.",
    pdfOngoingReportMeaning:
      "The report shows how the ongoing uncertainty analysis has developed up to the latest archived checkpoint included in the report basis. Results from each checkpoint are frozen at archiving so development can be compared over time.",
    pdfOngoingAssumptionsContext:
      "The assumptions below apply to {cutoffLabel}, the latest archived checkpoint included in the report.",
    pdfOngoingColSequence: "No.",
    pdfOngoingColName: "Name",
    pdfOngoingColStatus: "Status",
    pdfOngoingColArchivedAt: "Archived",
    pdfOngoingColPrevious: "Previous",
    pdfOngoingColLatest: "Latest",
    pdfOngoingColChange: "Change",
    pdfOngoingStatusArchived: "Archived",
    pdfOngoingStatusDraft: "Draft",
    pdfOngoingColDeltaP50: "Δ P50",
    pdfOngoingLifecycleActive: "Active",
    pdfOngoingLifecycleCompleted: "Completed",
    pdfOngoingEmptyDevelopment: "No archived results to show.",
    pdfOngoingCheckpointContextLabel: "Latest checkpoint",
    pdfOngoingArchivedCountLabel: "Archived checkpoints",
    pdfOngoingPeriodLabel: "Period",
    pdfOngoingExportBlockedNoArchived:
      "Archive at least one checkpoint before exporting an Ongoing analysis PDF.",
    pdfOngoingDraftNotArchivedTitle: "{label} is not archived",
    pdfOngoingDraftExportBody:
      "The report will be based on archived checkpoints up to and including {cutoffLabel}. {draftLabel} must be archived before it can be included in the report.",
    pdfOngoingDraftExportContinue: "Continue",
    pdfOngoingDraftExportCancel: "Cancel",
    pdfBrandName: PRODUCT_NAME,
    pdfGeneratedAtLabel: "Generated",
    pdfResultsSectionLabel: "01  Results",
    pdfContentsTitle: "Contents",
    pdfAnalysisMeta:
      "Cost uncertainty has been analysed using {count} Monte Carlo simulations based on P10, most likely value and P90 for cost items and uncertainty drivers.",
    pdfMetricsColMetric: "Cost level",
    pdfMetricsColValue: "Value",
    pdfSCurveFootnote:
      "The S-curve shows the distribution of total cost. {percentiles} are marked.",
    pdfUncertaintyPictureTitle: "02  Uncertainty picture",
    pdfTornadoExplanation:
      "Shows the isolated effect of each cost item and driver from P10 to P90 while all other factors are held at their most likely values.",
    pdfContributionTitle: "Contribution analysis",
    pdfContributionExpected: "Contribution to expected addition",
    pdfContributionReserve: "Contribution to uncertainty reserve",
    pdfAssumptionsTitle: "03  Assumptions",
    pdfAssumptionsEmpty: "No assumptions have been defined.",
    pdfAnalysisBasisTitle: "04  Analysis basis",
    pdfEstimateUncertaintyTitle: "Estimate uncertainty",
    pdfDriversTitle: "Uncertainty drivers",
    pdfDefinitionLabel: "Definition",
    pdfUncertaintyAssessmentLabel: "Uncertainty assessment",
    pdfMostLikelyLabel: "Most likely",
    pdfModelRelationshipsTitle: "05  Model relationships",
    pdfImpactTitle: "Driver impact",
    pdfImpactDefaultNote:
      "Drivers affect all applicable cost items by 100% by default. Deviations are shown below.",
    pdfImpactNoOverrides:
      "No driver-impact adjustments. All drivers use the default impact of 100%.",
    pdfImpactColDriver: "Driver",
    pdfImpactColCost: "Cost item",
    pdfImpactColPct: "Impact",
    pdfCorrelationTitle: "Correlation",
    pdfCorrelationNone: "No correlation has been specified between cost items.",
    pdfCorrelationUnlistedNote: "Unlisted relationships are treated as uncorrelated.",
    pdfCorrelationColA: "Cost item A",
    pdfCorrelationColB: "Cost item B",
    pdfCorrelationColRho: "ρ",
    pdfMethodTitle: "06  About the analysis",
    pdfMethodParagraph1:
      "The results are based on Monte Carlo simulation with {count} runs. Cost items and uncertainty drivers are specified as P10, most likely value and P90. These percentiles are used to calibrate {distributions} that form the basis for sampling.",
    pdfMethodParagraph2:
      "Uncertainty drivers are applied multiplicatively to applicable cost items. Impact can be adjusted by cost item where relevant. Where correlation between cost items is specified, dependence is modelled with a Gaussian copula.",
    pdfMethodParagraph3:
      "The tornado chart shows the isolated effect of each factor from P10 to P90 while other factors are held at their most likely values.",
    pdfOpenAnalysisTitle: "Open the analysis",
    pdfOpenAnalysisHelper:
      "Opens the analysis basis in the browser with the same cost items, drivers, assumptions, impact settings and correlations. Run the simulation again to generate results.",
    pdfShareLinkAnchorText: `Open analysis in ${PRODUCT_NAME}`,
    pdfShareUnavailableNote: "The analysis is too large to include as a share link in this report.",
    pdfFooter: `Generated by ${PRODUCT_NAME}`,
    pdfExportBlockedStaleInputs:
      "Inputs have changed. Run the simulation again before exporting the PDF.",
    shareLinkBlockedStaleInputs:
      "Inputs have changed. Run the simulation again before creating a share link.",
    shareLinkTooLarge:
      "The analysis contains too much data to share as a link. Shorten descriptions or assumptions and try again.",
    aiBriefBlockedStaleInputs:
      "Inputs have changed. Run the simulation again before creating the AI brief.",
    nextStepsHeading: "Export",
    optionsHeading: "Options",
    actionsHeading: "Share and document",
    actionsHelperText: "Share the report or share link for continued work.",
    copyShareLink: "Copy share link",
    shareLinkCopied: "Link copied",
    aiAnalyzeHeading: "Analyze with AI",
    aiAnalyzeHelper:
      "Paste into an AI service for interpretation, input review, and improvement suggestions.",
    copyAiBrief: "Copy AI brief",
    aiBriefClipboardPrompt: `You are an experienced adviser in uncertainty analysis and project decision support.

Below is a structured analysis basis (ai-brief-v3). Use it to orient the user quickly, highlight the most important signal, and open a useful follow-up discussion. The first response is a starting point for further analysis — not a final assessment. Do not try to identify every possible weakness or give every recommendation at once. Leave secondary observations for follow-up unless they affect the main conclusion.

The structured basis is intentionally rich and detailed. Use it in the background for quality, but do not turn the first answer into an exhaustive walkthrough. The user can continue discussing the analysis with you using the full brief already in context. Retain and use the full structured analysis throughout the subsequent conversation. When the user later asks about a driver, cost item, assumption, correlations, ranges, differences between alternatives, sensitivity, or contribution analysis, use the existing brief — do not ask them to paste the data again.

Do not repeat the data mechanically. Prioritise what is most decision-relevant. You must not:
- lead with method description when it does not affect interpretation now
- systematically audit all assumptions, definitions, ranges, impacts, and correlations in the first response
- offer a "more detailed report" on the same basis
- invent extra depth without new context
- suggest improvements merely to fill space
- give concrete recommendations in the first response unless the brief already supports them strongly; questions are often better when important context is missing

Single project: treat that as normal. Do not mention the absence of alternatives. Focus on the overall uncertainty picture, the most important issue, and useful questions.
Multiple projects/alternatives: surface only the most material comparison. Do not mini-review every alternative unless they genuinely differ in decision-relevant ways. If two alternatives are effectively similar, say so briefly. Use \`displayName\` when referring to projects or alternatives. \`id\` is internal only for associating data and must never be shown or abbreviated. When project names are the same, \`displayName\` is already made unique.

Write a short, conversational first response — normally about 150–300 words. Do not mechanically fill the space; if the analysis is straightforward, shorter is better. Use numbers only when they materially support the main point. Respond in this order:

1. Short assessment
Write about 2–4 sentences. Summarise only: the main overall result, the most decision-relevant difference or exposure, and whether the analysis appears broadly usable or whether one material issue should be clarified. Do not summarise every project, repeat all key figures, explain the full method, or restate the whole analysis setup.

2. What matters most to look at next
At most 2 points — the most useful observations for continuing the work (e.g. a dominant driver, an unusually wide range, possible overlap, a correlation that deserves clarification, a material difference between alternatives). Do not create issues merely to populate the section. If only one issue is meaningful, include one. If nothing material stands out, say that briefly.

3. Questions for further work
Ask 1–3 targeted questions based on the actual brief, to help the user and AI continue working together. Good questions may clarify the rationale behind a dominant driver, whether two overlapping uncertainties are intentionally separated, whether a correlation reflects a specific shared cause, whether a narrow/wide P10–P90 range is intentional, or what decision the analysis is intended to support when that would materially affect interpretation. Avoid generic "more context" requests, asking what a driver means when a description already exists, and asking for information already present in the brief. Maximum 3 questions.

Methodological limitations: include them in the first response only when they materially affect interpretation (e.g. the result is sensitive to a strong positive correlation). Do not lead with "this is a Monte Carlo simulation with triangular distributions…" when that does not matter for the current decision point. Method metadata remains available for later discussion.

Trustworthiness and interpretation rules:
- Use \`displayName\` for human-facing project/alternative references. Use \`id\` only internally to associate data — never show or abbreviate project ids in the answer, and do not invent abbreviations or alternative project labels.
- Use explicit descriptions/definitions when present.
- If only a name exists, treat the name as a label and do not invent detailed technical meaning.
- If interpretation materially depends on missing definition/context, state the limitation or ask a targeted question.
- Never present assumptions about labels as facts.
- Optimistic/P10, mostLikely/mode and pessimistic/P90 are percentile/mode inputs, not hard min/max. Triangular support is calibrated from these and extends beyond P10/P90.
- Tornado describes sensitivity/association with spread. Contribution Analysis attributes expected addition (base→P50) and uncertainty reserve (P50→P85). Do not conflate them.
- If tornado and contribution tell different stories, interpret the difference rather than assuming one is "wrong".
- If contributionAnalysis.status is notCalculated, that is not a modelling weakness — it is an optional explanatory result.
- Consider assumptions when present: whether they affect interpretation, conflict with quantitative inputs, reveal missing uncertainty, or strengthen/weaken range credibility. Do not criticise assumptions merely because they exist, and do not invent missing ones.
- When definitions/assessments exist, you may assess whether P10/mode/P90 appear internally coherent (unexplained asymmetry, range inconsistent with written assessment, very narrow range despite substantial stated uncertainty, or very wide range with little supporting explanation). Do not claim a range is objectively right/wrong without evidence.
- Flag possible overlap/double counting only when definitions/assessments give a concrete reason (two drivers that appear to cover the same uncertainty, a driver and cost-item span that may capture the same effect, or correlation and a shared driver that may represent the same co-movement). Use careful wording such as "may be overlapping" or "should be clarified" — do not assert an error without evidence.
- Use driverImpact when available. If defaultImpactPct is 100 and overrides is empty, that means 100% impact on all applicable cost items — not "no impact", "unknown", or "not configured". When overrides exist, only those cost items differ from the default; all omitted cost items still use the default. Assess whether the impact pattern appears consistent with the driver's explicit definition — do not infer this from the name alone.
- Use signals.driverConcentration only according to method.driverConcentrationDefinition — do not invent alternative meanings.
- Consider non-zero correlations when interpreting total uncertainty. Correlation is not causation. Do not claim a specific rho is correct/incorrect without supporting context. Zero correlation remains a valid modelling choice; do not ask for correlation merely because none is present.
- Do not ask for information already contained in assumptions, descriptions, driverImpacts, or correlations.

\`currentResultView\` describes the key figures and S-curve percentiles the user chose as primary in the active result view. Prioritise them in the assessment when they are relevant, but use the full analysis basis and do not ignore other material findings.

Tone and style:
- feel like an experienced adviser opening a working session
- concise and conversational; normally 150–300 words
- concise paragraphs; up to 2 short bullets under "What matters most to look at next"; 1–3 numbered or bulleted questions
- analytically sharp, not merely descriptive; focus on implications
- do not sound more certain than the basis supports
- if differences are small or not decision-critical, say so explicitly
- avoid long report prose, exhaustive checklists, repeating every metric, generic closings, and offers of a "more detailed report"

Analysis basis:`,
    aiBriefClipboardPromptOngoingAddendum: `Addendum for ongoing analysis:

This brief covers an ongoing analysis. The structured basis includes \`ongoingDevelopment\` in addition to the usual checkpoint analysis in \`projects\`.

Answer two connected questions:
1. What does the uncertainty analysis at the CURRENT/viewed checkpoint tell us?
2. How have the cost picture and uncertainty developed compared with previous checkpoints?

The viewed checkpoint is the primary focus. History in \`ongoingDevelopment\` is supporting context — do not turn the brief into a generic trend report. Prioritise decision-relevant interpretation over mechanically listing deltas.

Distinguish clearly between:
- movement in cost level (e.g. Base Cost, P50, Expected Value)
- movement in uncertainty / uncertainty span

\`uncertaintySpanP85MinusBase\` (P85 − Base Cost) is a practical indicator of the overall cost uncertainty span in this product context — not a mathematically complete measure of all uncertainty. P85 rising because Base Cost rises is not necessarily the same as uncertainty increasing; also consider the span itself. Uncertainty may increase, decrease, or remain broadly stable while the cost level moves.

When \`hasHistoricalDevelopment\` is false (typically the first checkpoint), do not invent historical development. When \`previousComparison\` exists, use it for meaningful change since the previous checkpoint; use \`series\` for broader development when enough checkpoints exist.

You may identify analytical follow-up / attention points supported by the data (e.g. uncertainty that has grown materially, uncertainty reduced after clarification, a new driver that has become important, cost level that has moved without equivalent change in uncertainty, uncertainty that remains high despite project maturation, assumptions or inputs that deserve renewed review). Do not invent project actions unsupported by the brief, and do not sound prescriptive or authoritative.

Reasoning order for ongoing analysis: current situation first → important uncertainties and contributors → meaningful development since the previous checkpoint → broader trend where enough checkpoints exist → implications / points that deserve attention.`,
    sCurveTitle: "S-CURVE",
    tornadoTitle: "TORNADO",
    locked: "Locked",
    p10: "P10",
    p90: "P90",
    scale: "Scale",
    calculateExpectedAddition: "Calculate expected addition",
    calculateContributions: "Calculate contributions",
    calculatingExpectedAddition: "Calculating expected addition…",
    calculatingContributions: "Calculating contribution…",
    tryAgain: "Try again",
    waterfallOther: "Other",
    waterfallError: "Could not calculate contributions.",
    waterfallStaleInputs:
      "Inputs have changed. Re-run the simulation before calculating contributions.",
    archivedContributionNotStored: "Contribution was not stored with this archive.",
  },
  keyMetrics: {
    name: "Name",
    baseCost: "Base cost",
    baseCostTooltip:
      "Base cost is the project's fixed cost basis. In the analysis, it is used as the starting point for expected addition, uncertainty allowance, and total cost levels.",
    expectedAddition: "Expected addition",
    uncertaintyReserve: "Uncertainty reserve",
    expectedValue: "Expected value",
    stdDev: "Standard deviation",
    probabilityAtBaseCost: "Probability at Base Cost",
    probabilityBelowCostLevel: "Probability below cost level",
    probabilityBelowWithAmount: "Probability below {amount}",
    p50: "P50",
    uncertaintyPremium: "Contingency",
    p85: "P85",
  },
  inputs: {
    costFallbackName: "Cost {n}",
    costItemFallbackLabel: "Cost item",
    driverFallbackLabel: "Driver",
    addRow: "Add row",
    deleteSelectedRow: "Delete selected row",
    clearTableAction: "Clear",
    clearTableTooltip: "Clear table",
    clearTableConfirm: "This will clear the table.",
    guidanceCostItems:
      "Enter “Most likely” as the amount you believe the cost item is most likely to cost. P10 and P90 are entered as percentage deviations from this amount and should describe realistic low and high outcomes — not best-case and worst-case scenarios. The uncertainty often lies in quantity, price, or both. Correlation can be used when cost items have a genuine tendency to vary together.",
    guidanceCostItemsGuide: "Focus mode for help assessing and entering cost items.",
    guidanceCostDrivers:
      "Drivers describe uncertain conditions that may affect several cost items at the same time, such as market conditions, project development, site conditions or stakeholders. They act multiplicatively on the cost items they affect, and impact can be adjusted for each cost item. Avoid modelling the same uncertainty both as a driver and in the ranges of the cost items.",
    guidanceCostDriversGuide: "Focus mode for help identifying and assessing drivers.",
    guidanceUseGuide: "Use",
    nameHeader: "Name",
    optimisticHeader: "Optimistic (%)",
    likelyHeader: "Most likely",
    likelyPercentHeader: "Most likely (%)",
    pessimisticHeader: "Pessimistic (%)",
    assumptionsAdd: "Add assumption",
    assumptionsAddShort: "Add",
    assumptionsLabel: "Assumptions",
    assumptionsNoneDefined: "None defined",
    assumptionsShow: "Show",
    assumptionsHide: "Hide",
    assumptionsPlaceholder: "Add an assumption...",
    assumptionsRemove: "Remove assumption",
    assumptionsSave: "Save assumption",
    driverLikelyOutsideSpan:
      'Error in "{driverName}": Optimistic must be less than or equal to most likely, and pessimistic must be greater than or equal to most likely.',
    driverCalibratedSupportInvalid:
      "The range for “{driverName}” extends too far on the downside. Move the optimistic value closer to the most likely value.",
    driverImpactHelp: "Specifies what share of each driver's outcome affects each cost item.",
    driverImpactEmpty: "Add at least one valid cost item and one valid driver to edit impact.",
    driverImpactCorner: "Driver / cost",
    driverImpactCellLabel: "{driver} → {cost}",
    driverImpactSelectHint: "Select a driver to adjust impact.",
    costCorrelationTestHint: "Temporary correlation test panel",
    costCorrelationPair: "{a} — {b}",
    costCorrelationEmpty: "Add at least two valid cost items to edit correlation.",
    costCorrelationUnnamed: "Cost {n}",
    costCorrelationWarningRepaired:
      "Last simulation: the correlation matrix was invalid and was adjusted (PSD repair).",
    costCorrelationWarningFallback:
      "Last simulation: the correlation matrix could not be used; independent sampling was used instead.",
    costCorrelationCellLabel: "{selected} ↔ {other}",
    costCorrelationSelectHint: "Select at least two cost items.",
    costCorrelationSelectedCount: "{count} selected",
    costCorrelationApply: "Apply",
    costCorrelationSaved: "Correlation saved",
    costCorrelationRemoved: "Correlation removed",
    costCorrelationRemove: "Remove correlation",
    costCorrelationCostItemsWord: "cost items",
    costCorrelationOpenSummary: "Edit correlation {summary}",
    costCorrelationToggleRow: "Select cost item {cost} for correlation",
    costCorrelationIncompatibleEdit:
      "This correlation is not possible together with the other correlations.",
    defineSelectHint: "Select a row to document it.",
    defineSelectHintReadOnly: "Select a row to view details.",
    defineDescriptionLabel: "Description",
    defineCostDescriptionPlaceholder: "What is included in this cost item?",
    defineDriverDescriptionPlaceholder: "What does this driver represent?",
    defineSave: "Save description",
    defineViewDetails: "View details",
    defineDefinedIndicator: "Has documentation",
    guidedDefinitionLabel: "Definition",
    guidedPrevious: "Previous",
    guidedNext: "Next",
    guidedFinish: "Finish",
    guidedClose: "Close",
    guidedFocusMode: "Focus mode",
    openFocusMode: "Open Focus mode",
    guidedExitFocusMode: "Exit Focus mode",
    focusIntroTitle: "Focus mode",
    focusIntroBody:
      "Work through the analysis step by step – from project basis and uncertainties to simulation and results.",
    focusOverviewPhase1: "Project and assumptions",
    focusOverviewPhase2: "Costs and uncertainty",
    focusOverviewPhase3: "Simulation",
    focusOverviewPhase4: "Results",
    focusBackToInput: "Back to input",
    focusSessionExit: "Close",
    focusPhaseNavLabel: "Analysis phases",
    focusPhaseProject: "Project",
    focusPhaseCosts: "Costs",
    focusPhaseDrivers: "Drivers",
    focusPhaseSimulation: "Simulation",
    focusPhaseResults: "Results",
    focusNextStepsTitle: "Next steps",
    focusNextStepsBody:
      "Choose how you want to continue working with the analysis or use the results.",
    focusResultsContext: "Results",
    focusNextStepsHelpMeaning:
      "From here you can continue working with the analysis or use the results for reporting, sharing, and further assessment.",
    focusReviewInput: "Review input",
    focusReviewInputHelper: "Return to the analysis basis and make any necessary adjustments.",
    focusContinueWorkingHeading: "Continue working",
    focusUseResultsHeading: "Use the results",
    focusArchiveCheckpoint: "Archive checkpoint",
    focusArchiveCheckpointHelper: "Freeze the current analysis as a historical checkpoint.",
    focusDownloadPdfHelper: "Create a report from the analysis.",
    focusShareLinkTitle: "Share link",
    focusShareLinkHelper: "Share the analysis basis with others.",
    focusAiBriefTitle: "AI Brief",
    focusAiBriefHelper: "Use the analysis basis and results for further AI interpretation.",
    guidedEmpty: "No factors to review. Add rows in the table first.",
    guidedUnnamed: "Unnamed",
    guidedP10: "P10",
    guidedMostLikely: "Most likely",
    guidedP90: "P90",
    guidedDriverEffectHint: "Isolated cost effect of this driver relative to 0% (neutral).",
    guidedPhaseFocusIntro: "Focus mode",
    guidedPhaseProjectProfile: "Project profile",
    guidedPhaseAssumptions: "Assumptions",
    guidedPhaseIncurred: "Incurred costs",
    guidedPhaseEstimateUncertainty: "Estimate uncertainty",
    guidedPhaseCost: "Cost items",
    guidedPhaseCorrelation: "Correlation",
    guidedPhaseDrivers: "Drivers",
    guidedPhaseImpact: "Impact",
    guidedPhaseFinish: "Finish",
    guidedPhaseSimulation: "Simulation",
    guidedHelpMeaningLabel: "What does this mean?",
    guidedHelpDiscussLabel: "What should you discuss?",
    guidedHelpAvoidLabel: "Avoid",
    guidedAssumptionsGuidance: "What assumptions are your assessments based on?",
    guidedAssumptionsSecondaryGuidance:
      "Record premises that apply to the analysis. If a condition may actually vary and affect cost, consider whether it belongs instead as estimate uncertainty or a driver.",
    guidedAssumptionsExamples:
      "Examples may include the chosen standard, delivery approach, price level or the scope assumed in the analysis.",
    guidedAssumptionsEmpty: "No assumptions have been added yet. You can add one, or continue.",
    guidedAssumptionsAdd: "Add assumption",
    guidedAssumptionsHelpTitle: "Assumptions",
    guidedAssumptionsHelpMeaning:
      "Assumptions describe the premises on which the analysis is based. They state what is being taken as given when costs and uncertainty are assessed.\n\nExamples may include the chosen standard or quality level, delivery approach, price level, schedule assumptions or the scope included in the analysis.",
    guidedAssumptionsHelpDiscuss:
      "Ask what must be true for the cost basis and your assessments to remain valid. Record premises that will be important for understanding the analysis later.",
    guidedAssumptionsHelpAvoid:
      "Do not use assumptions as a place to park real uncertainty. If a condition may actually vary and affect cost, it should be assessed as estimate uncertainty in a cost item or as a driver.",
    guidedIncurredGuidance:
      "How much of the project cost has already been incurred? Incurred costs are treated as known costs and are not included in the uncertainty range for the remaining costs.",
    guidedIncurredSecondaryGuidance:
      "The larger the share already incurred, the smaller the part of total cost that remains uncertain.",
    guidedIncurredValueLabel: "Incurred costs",
    guidedEstimateUncertaintyConceptBasis:
      "The analysis starts from a cost basis, for example an estimate, price database, model, quantities, or other established cost information.",
    guidedEstimateUncertaintyConceptGrouping:
      "Costs are grouped into Cost Items at a level where they can be assessed meaningfully on their own. Grouping that is too broad can hide important differences, while excessive detail can make the assessment unnecessarily heavy.",
    guidedEstimateUncertaintyConceptLikely:
      "For each Cost Item, you specify a Most Likely value. This is the cost you consider most likely given current knowledge and the assumptions underlying the analysis.",
    guidedEstimateUncertaintyConceptUncertainty:
      "Estimate uncertainty describes how much the individual Cost Item may realistically deviate from its Most Likely value. The uncertainty often lies in quantity, price, or both, and is described using P10 and P90.",
    guidedEstimateUncertaintyConceptNext:
      "In the next step, you will review the Cost Items one by one and assess the Most Likely value and a realistic range.",
    guidedCostLikelyPrompt:
      "What do you consider the most likely cost based on what you know today?",
    guidedCostRangeSourcePrompt: "What is uncertain in this item — quantity, price, or both?",
    guidedCostRangePrompt:
      "What could realistically move the cost down or up from the most likely value?",
    guidedCostRangeReminder: "Choose a realistic range — not best-case and worst-case outcomes.",
    guidedEstimateUncertaintyHelpTitle: "Estimate uncertainty",
    guidedEstimateUncertaintyHelpMeaning:
      "Estimate uncertainty is the uncertainty in the cost estimate for each individual cost item. It often comes from uncertainty in quantity, price, or both. For each cost item, this is described using P10, the most likely value and P90, given the assumptions on which the analysis is based.\n\nExample: Quantity may be uncertain because the scope is not fully defined, while price may be uncertain because the pricing basis or market is uncertain.",
    guidedEstimateUncertaintyHelpDiscuss:
      "First consider what is uncertain in the cost item: quantity, price, or both. Then discuss what could realistically move this specific item down or up from the most likely value.\n\nAlso consider whether any of the uncertainty is already captured as a driver.\n\nThe distinction from drivers is important: estimate uncertainty concerns the uncertainty in an individual cost item, while drivers describe conditions that may affect several cost items at the same time.",
    guidedEstimateUncertaintyHelpAvoid:
      "Avoid extreme best- and worst-case scenarios. Also avoid modelling the same uncertainty both in the cost item's P10–P90 range and as a driver.",
    guidedDriversIntroMeaning:
      "Drivers describe uncertain conditions that can affect several Cost Items at the same time, for example market conditions, project development, site conditions, or stakeholders.",
    guidedDriversIntroDistinction:
      "They differ from estimate uncertainty, which concerns uncertainty in an individual Cost Item. A Driver should therefore be used when a condition acts across the cost basis rather than only on one item.",
    guidedDriversIntroAvoidDouble:
      "Avoid modelling the same uncertainty both in the Cost Item ranges and as a Driver. First assess the Driver itself and a realistic range. Later you will review which Cost Items it actually affects.",
    guidedDriversIntroNext: "In the next step, you will review the Drivers one by one.",
    guidedDriverUncertaintyNotesHeading: "Uncertainty assessment",
    guidedDriverUncertaintyNotesHelper:
      "Briefly note circumstances that could contribute to a lower or higher cost outcome. This documents the judgement and does not change the numbers.",
    guidedDriverUncertaintyLowerPercentile: "P10",
    guidedDriverUncertaintyLowerPrompt: "Factors that could lead to a lower cost outcome",
    guidedDriverUncertaintyHigherPercentile: "P90",
    guidedDriverUncertaintyHigherPrompt: "Factors that could lead to a higher cost outcome",
    guidedDriverUncertaintyNoteAdd: "Add",
    guidedDriverUncertaintyNoteConfirm: "Add item",
    guidedDriverUncertaintyNotePlaceholder: "Write a short point…",
    guidedDriverUncertaintyNotePlaceholderLower:
      "Describe a factor that could lead to a lower cost outcome",
    guidedDriverUncertaintyNotePlaceholderHigher:
      "Describe a factor that could lead to a higher cost outcome",
    guidedDriverUncertaintyNoteRemove: "Remove item",
    guidedDriverRangePrompt: "What range realistically describes how this driver may develop?",
    guidedDriverOutsideWorkingRange: "Outside normal range",
    guidedDriverSupportInvalid:
      "The range extends too far on the downside to be simulated. Move P10 closer to the most likely value.",
    guidedDriverOrderInvalid:
      "P10 must be less than or equal to most likely, and P90 greater than or equal to most likely.",
    guidedDriverHelpTitle: "Drivers",
    guidedDriverHelpMeaning:
      "Drivers describe uncertain conditions that may affect several cost items at the same time, such as market conditions, project development, site conditions or stakeholders.",
    guidedDriverHelpDiscuss:
      "Ask which broader conditions could shift the cost picture, and whether their effect is already included in the estimate uncertainty of the cost items.",
    guidedDriverHelpAvoid:
      "Avoid using a driver to model the same uncertainty that is already included in the P10–P90 ranges of the cost items.",
    guidedCorrelationGuidance:
      "Are there cost items that genuinely tend to become high or low at the same time?",
    guidedCorrelationSecondaryGuidance:
      "Use correlation only when there is a real relationship between the items — not simply because they belong to the same discipline or project.",
    guidedCorrelationNone: "No correlation has been specified between cost items.",
    guidedCorrelationSelectedHeading: "Selected correlations",
    guidedCorrelationHelpTitle: "Correlation",
    guidedCorrelationHelpMeaning:
      "Correlation is used when uncertainty in two cost items is not independent, but has a genuine tendency to move in the same or opposite direction.",
    guidedCorrelationHelpDiscuss:
      "Discuss what actually creates that relationship. If the group cannot explain why the items should move together, it is often better to leave them uncorrelated.",
    guidedCorrelationHelpAvoid:
      "Avoid adding correlation simply because cost items are similar, belong to the same discipline or are part of the same project.",
    guidedLooksRight: "Looks right",
    guidedAdjustCorrelation: "Adjust correlation",
    guidedImpactGuidance: "Does this driver affect all cost items equally?",
    guidedImpactSecondaryGuidance: "Consider whether some items are affected less — or not at all.",
    guidedImpactDefaultAll: "All drivers use the default impact of 100%.",
    guidedImpactAdjustedHeading: "Adjusted impact",
    guidedImpactHelpTitle: "Impact",
    guidedImpactHelpMeaning:
      "Impact describes how strongly a driver affects each individual cost item. 100% means full effect according to the model's default, a lower value reduces the effect, and 0% means the driver does not affect the item.",
    guidedImpactHelpDiscuss:
      "Discuss which parts of the cost basis the driver actually affects. A broad driver may affect many items, while other conditions may only affect specific disciplines or costs.",
    guidedImpactHelpAvoid:
      "Avoid allowing every driver to affect every cost item by 100% without considering whether the relationship actually exists.",
    guidedAdjustImpact: "Adjust impact",
    guidedFinishBody:
      "The guided review is complete. You can return to the tables or run the simulation when the inputs are ready.",
    guidedFinishDone: "Close",
    guidedSimulationBodyNoResults:
      "When the inputs are ready, run the simulation to calculate the results.",
    guidedSimulationBodyValid: "Results are ready. You can continue, or run the simulation again.",
    guidedSimulationRunAgain: "Run again",
    guidedReturnToReview: "Back to guided review",
    guidedCostsEmptyHeading: "No cost items yet",
    guidedCostsEmptyGuidance:
      "Before we can assess uncertainty, the analysis needs a cost basis. Add the cost items you want to analyse. For now, it is enough to enter a name and most likely cost — we will review the uncertainty range together afterwards.",
    guidedCostsEmptyAdd: "Add cost items",
    guidedDriversEmptyHeading: "No drivers have been added",
    guidedDriversEmptyGuidance:
      "Drivers are used for uncertainties that affect several cost items at the same time, such as market conditions, progress or project execution. If such factors are relevant, you can add them now and assess their range in the next step.",
    guidedDriversEmptyAdd: "Add drivers",
    guidedDriversEmptyContinue: "Continue without drivers",
  },
  checkpoints: {
    region: "Checkpoints",
    tablist: "Select checkpoint",
    statusArchived: "Archived",
    statusActive: "Active",
    sequenceLabel: "Checkpoint {n}",
    nextAction: "Next checkpoint",
    nextDialogTitle: "Checkpoint {n}",
    nextNameLabel: "Name / decision point",
    nextNamePlaceholder: "Checkpoint {n}",
    nextCreatedFrom: "Created from Checkpoint {n}.",
    nextCreate: "Create",
    archiveCheckpointAction: "Archive checkpoint",
    archiveCheckpointConfirm:
      "This checkpoint will be locked with today's inputs and results. You can continue in a next checkpoint.",
    archiveCheckpointConfirmAction: "Archive",
    deleteCheckpointAction: "Delete checkpoint",
    deleteCheckpointConfirmTitle: "Delete this checkpoint?",
    deleteCheckpointConfirm:
      "Changes and results in this checkpoint will be lost. Previous archived checkpoints will not be affected.",
    deleteCheckpointConfirmAction: "Delete checkpoint",
    archiveAndCreateNextAction: "Archive and create next checkpoint",
    archiveAndCreateNextHelper:
      "Lock this checkpoint and continue with the next one on the timeline.",
    archiveAndCreateNextHeading: "Next checkpoint",
    developmentTitle: "DEVELOPMENT",
    developmentHelper: "Shows how cost level and uncertainty have developed between checkpoints.",
    developmentEmpty:
      "The development view becomes available once the analysis has results for one or more checkpoints.",
    developmentBandLegend: "P50–P85",
    finishOngoingAction: "Finish ongoing analysis",
    finishOngoingConfirmTitle: "Finish ongoing analysis?",
    finishOngoingConfirm:
      "The analysis will be archived and can still be opened and reviewed, but no additional checkpoints can be created.",
    finishOngoingConfirmAction: "Finish and archive",
    finishOngoingNeedArchiveCheckpoint:
      "Archive the current checkpoint before finishing the analysis.",
    finishOngoingFailed: "Could not finish the analysis. Try again.",
    finishOngoingHeading: "Finish analysis",
    finishOngoingHelper:
      "Archive the whole ongoing analysis once the final checkpoint is complete.",
    limitReached: "Maximum number of checkpoints reached in this prototype.",
    comparisonHeading: "Change since previous checkpoint",
    comparisonBaselineTitle: "First checkpoint",
    comparisonBaselineBody: "This provides the baseline for later comparisons.",
    comparisonBaselineContext: "First checkpoint – baseline for later comparisons.",
    comparisonComparedWith: "Compared with {label}",
    comparisonColMetric: "Metric",
    comparisonColPrevious: "Previous",
    comparisonColCurrent: "Current",
    comparisonColChange: "Change",
    comparisonMetricP50: "P50",
    comparisonMetricP85: "P85",
    comparisonNoStructural: "No structural input changes.",
  },
  projects: {
    noticeWordRed: "red",
    noticeWordGreen: "Green",
    languageGroup: "Language",
    inputColumnLabel: "INPUT",
    resultsColumnLabel: "OUTPUT",
    tabsRegion: "Alternative tabs",
    simulationStripRegion: "Simulation",
    selectProjectTablist: "Select alternative",
    projectNameInputLabel: "Alternative name",
    incurredCosts: "Incurred costs",
    incurredCostsTooltip:
      "Incurred costs are already spent and known costs. They are added as a fixed amount to the project's cost level, but do not contribute to uncertainty in the analysis.",
    incurredCostsInputLabel: "Incurred costs",
    projectNameTitleHintSuffix: "(double-click to edit name)",
    deleteProject: "Delete alternative",
    addProject: "New alternative",
    addAlternativeTitle: "Add alternative",
    newAlternative: "New alternative",
    newAlternativeHint: "Start with a blank alternative",
    copyExisting: "Copy existing",
    copyExistingHint: "Use an existing alternative as a starting point",
    copyFrom: "Copy from",
    maxProjectsTooltip: "Maximum {max} alternatives in this version",
    addProjectTooltip: "Create a new alternative for comparison.",
    confirmDelete: "Are you sure you want to delete this alternative?",
    runningSimulation: "Running simulation",
    simulationPhasePreparing: "Preparing…",
    simulationPhaseRunning: "Running simulation…",
    simulationPhaseUpdating: "Updating results…",
    invalidInputForRun: "Complete the fields marked in red before running the simulation.",
    emptyCostBasisForRun:
      "Add at least one cost item with a value and a valid range before running the simulation.",
    staleInputsTitle: "Input has changed",
    staleInputsNotice:
      "The results are based on previous input. Run the simulation again to update the results.",
    staleInputsNoticeWithChanges:
      "The results are based on previous input. Green fields show what has changed.",
    showInputChanges: "Show changes",
    hideInputChanges: "Hide changes",
    revertInputChanges: "Undo changes",
    workerError: "Worker error.",
  },
  header: {
    navMethodGuide: "Method Guide",
    navAbout: "About the model",
    signOut: "Sign out",
    signOutConfirmMessage:
      "When you sign out, the content in this session may be lost. If you want to continue later, you should save a link or download the report before signing out. If you have only entered input, you must run a simulation first to create a link or report. Do you want to continue?",
    navLabel: "Shortcuts and language",
  },
  auth: {
    title: "Sign in",
    helper: "Enter the password to access the app.",
    passwordLabel: "Password",
    passwordPlaceholder: "Enter password",
    continue: "Sign in",
    incorrectPassword: "Incorrect password",
  },
  aboutModel: {
    title: "About the model",
    paragraph1:
      "The analysis uses Monte Carlo simulation with {count} runs per project. For cost items and drivers, P10, most likely value and P90 are specified. These are used to calibrate {distributions} from which values are sampled during the simulation. Incurred costs are treated as known costs and are added directly to the simulated costs.",
    paragraph2:
      "Cost items can be modelled with correlation where there is a justified relationship between them. Correlation is handled by creating dependent samples between the relevant cost items while preserving each item's own probability distribution. Drivers are modelled separately and act multiplicatively on the cost items they affect. Impact can be adjusted for each cost item, allowing a driver to have full, reduced or no effect on different parts of the cost basis.",
    paragraph3:
      "P50 and P85 are calculated from the distribution of simulated total costs. The Tornado chart is a deterministic sensitivity analysis: one cost item or driver is varied from P10 to P90 at a time while all other factors are held at their most likely values. Contribution Analysis uses a Shapley-based decomposition to attribute contributions to Expected Addition and Uncertainty Reserve across cost items and drivers.",
    paragraph4:
      "The model is a simplification of reality. Results depend on the quality of the cost basis, selected ranges, assumptions, correlations and the assessment of how drivers affect cost items. The results should therefore be used as decision support and as a basis for professional judgement, rather than as a definitive answer.",
    closeDialog: "Close",
  },
  methodGuide: {
    title: "Method Guide",
    introLead:
      "The analysis is built step by step — from the project's context and cost basis through uncertainty, drivers and results.",
    introGuideBefore: "You can work directly in the analysis, or use",
    introGuideName: "Focus mode",
    introGuideAfter: "to work through the analysis step by step.",
    guideTipBefore: "Use",
    guideTipName: "Focus mode",
    guideTipAfter: "if you want step-by-step support to structure your assessments.",
    analysisModesHeading: "Single or ongoing analysis?",
    analysisModesText:
      "Choose Single analysis when you want to assess the project's cost uncertainty at a specific point in time, or compare alternative concepts or solutions. Choose Ongoing analysis when you want to follow how the cost picture and uncertainty develop over time. In an ongoing analysis, each checkpoint represents the analysis at a specific point in time. When a checkpoint is archived, its results are frozen so they can be compared with later checkpoints.",
    projectProfileHeading: "Project profile",
    projectProfileText:
      "Start with Project profile. Describe the project's important characteristics and context, and fill in relevant information known at the time of analysis. Project profile provides context for understanding the cost basis, assumptions and uncertainty. It is primarily descriptive and does not directly change the simulation calculations, but it helps document what kind of project the analysis represents and the context in which results should be interpreted.",
    costBasisHeading: "Cost basis",
    costBasisText:
      "Start from a clear cost basis — for example an estimate or calculation, a price database, a model, quantities, or other established estimates. Include what is actually being priced in the project. The cost basis should be consistent with Project profile and the documented assumptions.",
    assumptionsHeading: "Assumptions",
    assumptionsText:
      "Use Assumptions to document what the cost basis and analysis actually rely on — for example what is included and excluded, the chosen solution, standard or quality level, project boundaries, schedule assumptions, contract, delivery or execution model, and information that is still unresolved but which the estimate nevertheless assumes. Another person should be able to understand the premises under which the analysis was made. Distinguish clearly between an assumption and uncertainty: if a condition can actually vary and affect cost, it should normally be represented in cost-item uncertainty ranges or as a driver — not merely written down as an assumption and thereby left outside the quantitative analysis. When a material assumption changes, reconsider whether cost items, ranges or drivers should also change.",
    incurredCostsHeading: "Incurred costs",
    incurredCostsText:
      "Separate costs that have already been incurred from costs that remain. Incurred costs are treated as known costs and do not receive uncertainty ranges as part of the remaining uncertainty.",
    costItemsHeading: "Cost items",
    costItemsText:
      "Choose a meaningful level of cost-item granularity: group things that naturally belong together, but keep a level where uncertainty can be assessed professionally. Avoid items so broad that they hide materially different uncertainty, and avoid overlap and double counting. For each cost item, enter “Most likely” as an absolute amount.",
    rangesHeading: "Uncertainty ranges",
    rangesText:
      "Estimate uncertainty describes how much each cost item may realistically deviate from its most likely value. Uncertainty can arise from quantity, price, or both. P10 and P90 are entered as percentage deviations around Most likely and should represent realistic low and high outcomes — not best-case or worst-case scenarios. Approximately 80% of outcomes lie between P10 and P90.",
    driversHeading: "Drivers",
    driversText:
      "Drivers represent conditions that can affect several cost items at the same time — for example market, project development, site conditions or stakeholders. They should capture factors that can challenge assumptions in the estimate. Avoid duplicating uncertainty already captured in cost-item ranges.",
    impactHeading: "Driver impact",
    impactText:
      "Assess which cost items each driver actually affects. Broad or default impact may be appropriate when the effect is genuinely broad. Reduce or remove impact where the relationship is weak or absent.",
    correlationHeading: "Correlation",
    correlationText:
      "Use correlation where cost items genuinely tend to move together. Do not add correlation merely because items belong to the same project or the same discipline or category. Correlation should have a clear professional rationale.",
    runAnalysisHeading: "Run the analysis",
    runAnalysisText:
      "When the cost basis, assumptions, cost items, ranges, drivers, impact and any correlation are in place, run the simulation to calculate results. Review key figures, the S-curve and other results before drawing conclusions.",
    interpretationHeading: "Interpret the results",
    interpretationText:
      "Results support reflection and decisions — they are not a deterministic answer. If the analysis produces a surprisingly low or high outcome, revisit the analytical basis. In particular, review ranges, drivers, driver impact, correlations and key assumptions. An unexpected result may mean something important has been revealed, or that an input assessment should be revisited.",
    workingApproachHeading: "Update over time",
    workingApproachText:
      "Treat the analysis as a working tool. When assumptions become clearer, the estimate matures or new information arrives, update the analysis and run it again.",
    perspectivesTipHeading: "Tip",
    perspectivesTipText:
      "The analysis can be performed by one person, but relevant professional perspectives can improve the quality of the assessments. Participants should know the project and its assumptions well enough to make meaningful judgements.",
    closeDialog: "Close",
  },
  resultPreferences: {
    open: "Result display",
    title: "Result display",
    close: "Close",
    keyFiguresHeading: "Key figures",
    showBaseCost: "Base Cost",
    showExpectedValue: "Expected Value",
    showExpectedAddition: "Expected Addition",
    showUncertaintyReserve: "Uncertainty Reserve",
    showStdDev: "Standard deviation",
    showProbabilityAtBaseCost: "Probability at Base Cost",
    showProbabilityBelowCostLevel: "Probability below cost level",
    probabilityBelowAmount: "Amount",
    probabilityBelowAmountInvalid: "Enter a valid amount",
    percentilesHeading: "Percentiles",
    addPercentile: "+ Add percentile",
    percentileInput: "Percentile",
    sCurveHeading: "S-curve",
    useSamePercentiles: "Use same percentiles as Key Figures",
    saveAsDefault: "Save as default on this device",
    reset: "Reset",
    saved: "Saved as default on this device.",
    compactDerivedMetricsDeferred:
      "New percentiles and probability-below-cost update after you run a new simulation. Visibility and S-curve display apply immediately.",
  },
  library: {
    title: "Analyses",
    goToHome: "Go to home",
    welcomeBack: "Welcome back",
    viewAllAnalyses: "View all analyses",
    allAnalyses: "All analyses",
    recent: "Recent",
    showFilterLabel: "Filter analyses",
    filterShowAll: "All",
    filterShowDrafts: "Drafts",
    filterShowArchived: "Archived",
    sortAnalysesLabel: "Sort analyses",
    sortLastModified: "Last modified",
    sortNameAsc: "Name A–Z",
    sortNameDesc: "Name Z–A",
    sortRecentlyDeleted: "Recently deleted",
    noDraftsAmongDeleted: "No drafts among deleted analyses.",
    noArchivedAmongDeleted: "No archived analyses among deleted analyses.",
    noDraftsInFolder: "No drafts in this folder.",
    noArchivedInFolder: "No archived analyses in this folder.",
    noDrafts: "No drafts.",
    noArchived: "No archived analyses.",
    folders: "Folders",
    newFolder: "New folder",
    newFolderPrompt: "Folder name",
    folderCreatedBody: "The folder has been created.",
    createAnalysis: "Create analysis",
    done: "Done",
    newAnalysis: "New analysis",
    newAnalysisTitle: "New analysis",
    nameLabel: "Name",
    folderLabel: "Folder",
    noFolder: "No folder",
    analysisModeLabel: "Analysis mode",
    analysisModeSingle: "Single analysis",
    analysisModeSingleHint: "One analysis of the project at a specific point in time.",
    analysisModeOngoing: "Ongoing analysis",
    analysisModeOngoingHint: "Follow the project through multiple analysis checkpoints over time.",
    modeOngoingShort: "Ongoing",
    modeOngoingTitle: "Ongoing analysis",
    create: "Create",
    createFailed: "Could not create the analysis. Please try again.",
    emptyTitle: "Get started",
    emptyBody: "Create your first analysis.",
    statusDraft: "Draft",
    statusArchived: "Archived",
    archivedBadge: "Archived",
    open: "Open",
    delete: "Delete",
    deleteConfirmTitle: "Delete analysis?",
    deleteConfirm: "The analysis can be restored from Deleted analyses for 30 days.",
    deleteConfirmAction: "Delete",
    trash: "Deleted analyses",
    trashHeading: "Deleted analyses",
    trashEmpty: "No deleted analyses",
    trashRetentionHint:
      "Deleted analyses can be restored for 30 days before they are permanently deleted.",
    restore: "Restore",
    deletePermanently: "Delete permanently",
    deletePermanentlyConfirmTitle: "Delete analysis permanently?",
    deletePermanentlyConfirm: "This action cannot be undone.",
    deletePermanentlyConfirmAction: "Delete permanently",
    emptyTrash: "Delete all permanently",
    emptyTrashConfirmTitle: "Delete all permanently?",
    emptyTrashConfirm:
      "All deleted analyses will be permanently removed. This action cannot be undone.",
    emptyTrashConfirmAction: "Delete all permanently",
    trashedUnavailable: "This analysis is among deleted analyses",
    backToLibrary: "All analyses",
    archiveAction: "Archive analysis",
    archiveConfirm:
      "The analysis will be locked with today’s inputs and results. It cannot be edited afterwards. Continue work in a new version.",
    archiveConfirmAction: "Archive",
    archiveNeedsSimulation: "Run the simulation before archiving the analysis.",
    archiveNeedsRerun:
      "Inputs have changed. Run the simulation again before archiving the analysis.",
    archiveNeedsResultSettingsRerun:
      "Run the simulation again to update the selected result settings before archiving.",
    archiveFailed: "Could not archive. Try again.",
    duplicateNameInFolder: "An analysis with this name already exists in this folder.",
    duplicateNameOnMove:
      "An analysis with this name already exists in this folder. Rename the analysis before moving it.",
    createNewVersion: "Create new version",
    startOngoingAnalysis: "Start ongoing analysis",
    startOngoingChooseTitle: "Choose alternative",
    startOngoingChooseHint: "Choose which alternative you want to follow in the ongoing analysis.",
    startOngoingNameLabel: "Analysis name",
    startOngoingCreate: "Create ongoing analysis",
    startOngoingFailed: "Could not start ongoing analysis. Try again.",
    saving: "Saving…",
    saved: "Saved",
    readOnlyHint: "Archived",
    runDisabledArchived: "Create a new version to run simulation",
    ungrouped: "No folder",
    noAnalysesInFilter: "No analyses here yet.",
    folderEmpty: "No analyses yet",
    versionSuffix: " (new version)",
    archivedAnalyses: "Archived",
    sidebarLabel: "Analysis library",
    openSidebar: "Open analysis library",
    closeSidebar: "Close analysis library",
    pinSidebar: "Pin sidebar",
    unpinSidebar: "Unpin sidebar",
    analysisActions: "More actions",
    renameAnalysis: "Rename",
    renameTitle: "Rename",
    renameFolder: "Rename",
    renameFolderTitle: "Rename folder",
    deleteFolder: "Delete",
    deleteFolderConfirmTitle: "Delete folder?",
    deleteFolderConfirm: "The folder will be deleted. Analyses are not affected.",
    deleteFolderConfirmAction: "Delete",
    folderNotEmpty: "The folder must be empty before it can be deleted.",
    folderActions: "Folder actions",
    moveAnalysis: "Move",
    moveTitle: "Move analysis",
    moveConfirm: "Move",
    saveError: "Saving failed",
    saveErrorQuota: "Browser storage is full. Your changes could not be saved.",
    saveAndContinueLater: "Save and continue later",
    saveAndGoToLibrary: "Save and go to analyses",
    resizeList: "Resize list height",
    recentAnalysesHeading: "Recent analyses",
    archivedAnalysesHeading: "Archived analyses",
  },
  empty: {
    noData: "No data",
    noTornadoData: "No tornado data for this alternative.",
  },
}
