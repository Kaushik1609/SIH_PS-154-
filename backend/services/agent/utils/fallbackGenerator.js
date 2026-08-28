/**
 * Deterministic grounded fallback generator for all output formats.
 * Used when LLM API keys are missing or when LLM API returns 401/403/error.
 */
export const generateGroundedFallback = (type, state) => {
    const rawText = (state.evidenceContext || state.prompt || "Disaster situation briefing").trim()
    const sentences = rawText.split(/(?<=[.?!])\s+/).filter(s => s.trim().length > 10)
    const chunkIds = state.sourceChunks?.map(c => c.chunkId) || []

    const firstSentence = sentences[0] || "Critical incident monitoring in progress."
    const audience = state.audience || "General Public"
    const tone = state.tone || "Formal & Authoritative"
    const language = state.language || "English"

    switch (type) {
        case "advisory":
            return {
                title: "Emergency Situation & Response Advisory",
                date: new Date().toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' }),
                situation: sentences.slice(0, 2).join(" ") || "Situation response teams are actively assessing grounded reports.",
                affectedAudience: audience,
                riskImpact: sentences[2] || "Potential operational disruption, safety hazards, and resource constraints reported.",
                recommendedAction: sentences[3] || "Follow local directives, maintain communication channels, and report new developments to emergency coordination teams.",
                contactDetails: "Emergency Operations Center (EOC) | Hotline: 112 / 911 | ops@cortexai.org",
                citations: chunkIds.slice(0, 3)
            }

        case "executiveSummary":
        case "executivesummary":
            return {
                context: sentences.slice(0, 2).join(" ") || "Summary of current operational status and verified findings.",
                keyFacts: sentences.slice(0, 4).length > 0 ? sentences.slice(0, 4) : [
                    "Field operations initiated across critical zones.",
                    "Evidence-backed data processing established.",
                    "Inter-agency coordination standing by."
                ],
                implications: [
                    "Immediate focus required on priority logistics and public communication.",
                    "Continuous telemetry and status monitoring recommended."
                ],
                risks: [
                    "Communication latency in severely impacted perimeters.",
                    "Supply chain bottlenecks if relief dispatch is delayed."
                ],
                recommendations: [
                    "Authorize rapid deployment of emergency response units.",
                    "Publish coordinated multi-channel advisories immediately."
                ],
                decisionRequired: "Approve operational resource allocation and public broadcast schedule.",
                citations: chunkIds.slice(0, 4)
            }

        case "videoScript":
        case "videoscript":
            return {
                objective: state.objective || "Rapid Public Awareness & Action Broadcast",
                targetDuration: "60 seconds",
                scenes: [
                    {
                        sceneNumber: 1,
                        visualDirection: "Wide drone shot of the affected area with alert banner overlay.",
                        narration: `Urgent update for ${audience}: ${firstSentence}`,
                        subtitle: `Alert: ${firstSentence.slice(0, 80)}`
                    },
                    {
                        sceneNumber: 2,
                        visualDirection: "Infographic map highlighting high-risk zones and relief centers.",
                        narration: sentences[1] || "Emergency services are actively deploying assets to mitigate further impact.",
                        subtitle: "Active response operations deployed."
                    },
                    {
                        sceneNumber: 3,
                        visualDirection: "Split screen displaying emergency contact numbers and verified safety protocols.",
                        narration: sentences[2] || "Stay tuned to verified official channels for ongoing advisories and stay in designated safe zones.",
                        subtitle: "Hotline: 112 | Official updates at cortexai.org"
                    }
                ],
                citations: chunkIds.slice(0, 3)
            }

        case "presentation":
            return {
                title: "Crisis Response & Incident Strategy",
                subtitle: `Executive Briefing for ${audience} — ${new Date().toLocaleDateString()}`,
                slides: [
                    {
                        title: "1. Executive Overview",
                        points: [
                            firstSentence,
                            `Primary Audience: ${audience}`,
                            `Tone & Stance: ${tone}`
                        ],
                        speakerNotes: "Provide rapid context and establish clear command hierarchy.",
                        dataVisualRecommendation: "High-level status banner with severity index indicator."
                    },
                    {
                        title: "2. Incident Assessment & Findings",
                        points: sentences.slice(1, 4).length > 0 ? sentences.slice(1, 4) : [
                            "Situation telemetry gathered from verified field inputs.",
                            "Resource bottlenecks identified for rapid response.",
                            "Containment and relief priorities ranked by severity."
                        ],
                        speakerNotes: "Highlight core evidence points derived from source reports.",
                        dataVisualRecommendation: "Multi-layered incident map showing perimeter lines."
                    },
                    {
                        title: "3. Directives & Action Framework",
                        points: [
                            "Deploy emergency coordination teams to priority sectors.",
                            "Maintain unified communications across public and official channels.",
                            "Review logistics capacity every 6 hours."
                        ],
                        speakerNotes: "Focus on executable decisions and assign accountability.",
                        dataVisualRecommendation: "Timeline Gantt chart of immediate 24-hour milestones."
                    },
                    {
                        title: "4. Communication & Next Steps",
                        points: [
                            "Distribute tailored alerts across social and broadcast media.",
                            "Establish daily briefing cadence with leadership.",
                            "Monitor incoming ground reports for real-time adjustments."
                        ],
                        speakerNotes: "Open floor for leadership queries and finalize sign-offs.",
                        dataVisualRecommendation: "Contact matrix and escalation tree."
                    }
                ],
                citations: chunkIds.slice(0, 4)
            }

        case "infographic":
            return {
                headline: "CRISIS SITUATION AT A GLANCE",
                keyMessages: [
                    firstSentence,
                    sentences[1] || "All emergency response units activated on high alert.",
                    "Citizens are advised to follow official verification channels."
                ],
                statistics: [
                    { label: "Incident Severity", value: "Level 2 Alert" },
                    { label: "Response Coverage", value: "100% Deployed" },
                    { label: "Status Update Cadence", value: "Every 2 Hours" }
                ],
                contentHierarchy: [
                    "Priority 1: Immediate Safety & Evacuation Advisory",
                    "Priority 2: Relief Center & Asset Distribution",
                    "Priority 3: Official Verification & Contact Directory"
                ],
                layoutRecommendation: "Hero banner with 3-metric KPI cards, interactive zone map, and prominent emergency action list.",
                citations: chunkIds.slice(0, 3)
            }

        case "linkedin":
            return {
                hook: `🚨 Operational Situation Update: Coordinated Crisis Communications`,
                body: `${firstSentence}\n\nOur emergency response team is executing verified protocols to ensure public safety and operational continuity. Key actions underway:\n\n• Continuous ground assessment and telemetry validation.\n• Inter-agency communication synchronization.\n• Multi-channel resource mobilization.\n\nWe urge all stakeholders and leadership partners to align with standard crisis directives.`,
                tone: tone,
                cta: "For verified updates and resource inquiries, contact our Emergency Operations Team directly.",
                hashtags: ["#CrisisManagement", "#PublicSafety", "#EmergencyResponse", "#OperationalResilience", "#CortexAI"],
                citations: chunkIds.slice(0, 3)
            }

        case "twitter":
            return {
                mode: "thread",
                post: `🚨 SITUATION ALERT: ${firstSentence.slice(0, 180)} Follow official instructions. #EmergencyAlert #CortexAI`,
                thread: [
                    `(1/3) 🚨 SITUATION ALERT: ${firstSentence.slice(0, 180)}`,
                    `(2/3) 📍 Status: Emergency response operations are actively underway. Follow all safety guidelines and stay tuned for localized updates.`,
                    `(3/3) 📞 For immediate assistance or verified reports, contact the Emergency Command Center at 112 or visit cortexai.org. #PublicSafety`
                ],
                hashtags: ["#EmergencyAlert", "#CrisisResponse", "#PublicSafety", "#CortexAI"],
                citations: chunkIds.slice(0, 3)
            }

        default:
            return {
                title: "Generated Situation Report",
                content: rawText,
                citations: chunkIds
            }
    }
}
