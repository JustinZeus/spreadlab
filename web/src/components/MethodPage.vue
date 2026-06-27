<script setup lang="ts">
import { usePage } from '@/composables/usePage'

// The Explainer tab is the home for the method and sources, the two short
// pages the proposal promises so the demo's results can be examined and
// reproduced rather than taken on trust. Two parts:
//   1. How the model works, structured loosely on the ODD protocol for
//      agent-based models (Overview, Design concepts, Details) but kept
//      readable, not a form dump.
//   2. The source behind each parameter, mapped to the project team's
//      open-access literature review.
// All copy is plain English; no em dashes (commas, colons, parentheses).

const { navigate } = usePage()

// The per-parameter source map. Each row is one lever in the model (or one
// reserved literature parameter), what it does, and the open-access source(s)
// the project team grounded it in. Kept as data so the table stays in step
// with the literature review and is trivial to fact-check against it.
interface ParameterSource {
  name: string
  status: 'live' | 'reserved'
  role: string
  sources: string[]
}

const parameterSources: ParameterSource[] = [
  {
    name: 'Baseline forwarding',
    status: 'live',
    role: 'Each student’s base chance of forwarding the fake along a friendship after seeing it. Treated as a low / medium / high sensitivity range, not a fitted fact, because deepfake-specific adolescent diffusion data are scarce.',
    sources: [
      'Kim et al. (2023), comprehensive sexuality education meta-analysis',
      'Brigham et al. (2024), perceptions of AI-generated non-consensual imagery',
      'Kamaruddin et al. (2023), cyberbullying intervention meta-analysis',
    ],
  },
  {
    name: 'Novelty / shock value',
    status: 'live',
    role: 'Raises forwarding when the content is surprising or scandalous, so novel material travels faster and deeper than ordinary information.',
    sources: ['Vosoughi, Roy & Aral (2018), the spread of true and false news online'],
  },
  {
    name: 'Harm awareness / AI literacy',
    status: 'live',
    role: 'Lowers forwarding: a year group that reads a synthetic image as non-consensual abuse rather than a joke forwards less and supports the target more.',
    sources: [
      'Ringrose, Horeck & Rodda (2026), sexualized deepfakes in UK schools',
      'Brigham et al. (2024), perceptions of AI-generated non-consensual imagery',
      'Kim et al. (2023), comprehensive sexuality education meta-analysis',
    ],
  },
  {
    name: 'Program effect (the education lever)',
    status: 'live',
    role: 'Applies education as a strong but imperfect reduction in an educated student’s forwarding probability. Explored as a sensitivity range, because intervention effect sizes vary and no deepfake-specific causal estimate exists.',
    sources: [
      'Kim et al. (2023), comprehensive sexuality education meta-analysis',
      'Kamaruddin et al. (2023), cyberbullying intervention meta-analysis',
      'Kasturiratna et al. (2024), umbrella review of cyberbullying interventions',
    ],
  },
  {
    name: 'Network degree / centrality',
    status: 'live',
    role: 'How many friends each student has. Highly connected students expose more peers, which is why the model can target the most-connected rather than only random students.',
    sources: [
      'Weng, Menczer & Ahn (2013), virality and community structure',
      'Molano & Jones (2018), social centrality and aggressive behaviour',
      'Laninga-Wijnen et al. (2021), aggressive peer norms and classroom climate',
    ],
  },
  {
    name: 'Community clustering',
    status: 'live',
    role: 'The dense friend groups and bridge ties of a real year group. A fake first spreads inside tight clusters; bridge ties then carry it school-wide.',
    sources: [
      'Weng, Menczer & Ahn (2013), virality and community structure',
      'Monsted et al. (2017), complex contagion of information on social media',
    ],
  },
  {
    name: 'Social reward / status',
    status: 'reserved',
    role: 'A reward term for students who gain attention or status by forwarding. Documented and reserved for the calibrated model, not yet a live lever here.',
    sources: [
      'Molano & Jones (2018), social centrality and aggressive behaviour',
      'Laninga-Wijnen et al. (2021), aggressive peer norms and classroom climate',
      'Ringrose, Horeck & Rodda (2026), sexualized deepfakes in UK schools',
    ],
  },
  {
    name: 'Repeated exposure / threshold',
    status: 'reserved',
    role: 'Forwarding that rises with the number of peers who already sent the image (complex contagion). Deferred: the demo keeps a single-draw cascade; repeated-exposure threshold dynamics are Year-1 funded work.',
    sources: [
      'Monsted et al. (2017), complex contagion of information on social media',
      'Weng, Menczer & Ahn (2013), virality and community structure',
    ],
  },
  {
    name: 'Gendered norms / victim-blaming',
    status: 'reserved',
    role: 'Higher forwarding and victim-blaming where double standards and low consent norms are present in a peer group. Documented and reserved.',
    sources: [
      'Laninga-Wijnen et al. (2021), aggressive peer norms and classroom climate',
      'Ringrose, Horeck & Rodda (2026), sexualized deepfakes in UK schools',
      'Brigham et al. (2024), perceptions of AI-generated non-consensual imagery',
      'Kim et al. (2023), comprehensive sexuality education meta-analysis',
    ],
  },
  {
    name: 'Bystander efficacy',
    status: 'reserved',
    role: 'Whether students who judge the act as wrong actually act (support, challenge, report). Helping rises with self-efficacy. Documented and reserved.',
    sources: [
      'Hu et al. (2023), empathy and bystander helping in cyberbullying',
      'Ringrose, Horeck & Rodda (2026), sexualized deepfakes in UK schools',
      'Kamaruddin et al. (2023), cyberbullying intervention meta-analysis',
    ],
  },
  {
    name: 'School climate / policy clarity',
    status: 'reserved',
    role: 'Clear rules, trusted reporting routes, and adult support that reduce cyberbullying-related risk. Documented and reserved.',
    sources: [
      'Kasturiratna et al. (2024), umbrella review of cyberbullying interventions',
      'Kamaruddin et al. (2023), cyberbullying intervention meta-analysis',
      'Ringrose, Horeck & Rodda (2026), sexualized deepfakes in UK schools',
    ],
  },
]

// Full reference list (the open-access sources from the team's review),
// rendered once below the table so each row above can cite by short name.
interface Reference {
  code: string
  text: string
  href: string
}

const references: Reference[] = [
  {
    code: 'S1',
    text: 'Vosoughi, S., Roy, D., & Aral, S. (2018). The spread of true and false news online. Science, 359(6380), 1146-1151.',
    href: 'https://doi.org/10.1126/science.aap9559',
  },
  {
    code: 'S2',
    text: 'Weng, L., Menczer, F., & Ahn, Y.-Y. (2013). Virality prediction and community structure in social networks. Scientific Reports, 3, 2522.',
    href: 'https://doi.org/10.1038/srep02522',
  },
  {
    code: 'S3',
    text: 'Monsted, B., Sapiezynski, P., Ferrara, E., & Lehmann, S. (2017). Evidence of complex contagion of information in social media: An experiment using Twitter bots. PLOS ONE, 12(9), e0184148.',
    href: 'https://doi.org/10.1371/journal.pone.0184148',
  },
  {
    code: 'S4',
    text: 'Molano, A., & Jones, S. M. (2018). Social centrality and aggressive behavior in the elementary school. Social Development, 27(2), 415-430.',
    href: 'https://doi.org/10.1111/sode.12267',
  },
  {
    code: 'S5',
    text: 'Laninga-Wijnen, L., van den Berg, Y. H. M., Mainhard, T., & Cillessen, A. H. N. (2021). The role of aggressive peer norms in elementary school children’s perceptions of classroom peer climate and school adjustment. Journal of Youth and Adolescence, 50, 1582-1600.',
    href: 'https://doi.org/10.1007/s10964-021-01432-0',
  },
  {
    code: 'S6',
    text: 'Ringrose, J., Horeck, T., & Rodda, E. (2026). Sexualized deepfakes in UK schools: Understanding and preventing AI-generated image-based sexual abuse through better AI literacies. Behavioral Sciences, 16(4), 554.',
    href: 'https://doi.org/10.3390/bs16040554',
  },
  {
    code: 'S7',
    text: 'Brigham, N. G., Wei, M., Kohno, T., & Redmiles, E. M. (2024). "Violation of my body:" Perceptions of AI-generated non-consensual (intimate) imagery. SOUPS 2024.',
    href: 'https://www.usenix.org/conference/soups2024/presentation/brigham',
  },
  {
    code: 'S8',
    text: 'Kim, E. J., et al. (2023). A meta-analysis of the effects of comprehensive sexuality education programs on children and adolescents. Healthcare, 11(18), 2511.',
    href: 'https://doi.org/10.3390/healthcare11182511',
  },
  {
    code: 'S9',
    text: 'Kamaruddin, I. K., et al. (2023). A systematic review and meta-analysis of interventions to decrease cyberbullying perpetration and victimization. Frontiers in Psychiatry, 14, 1014258.',
    href: 'https://doi.org/10.3389/fpsyt.2023.1014258',
  },
  {
    code: 'S10',
    text: 'Hu, Y., Zhang, T., Shi, H., & Fan, C. (2023). Empathy and bystander helping behavior in cyberbullying among adolescents. Frontiers in Psychology, 14, 1196571.',
    href: 'https://doi.org/10.3389/fpsyg.2023.1196571',
  },
  {
    code: 'S11',
    text: 'Kasturiratna, K. T. A. S., et al. (2024). Umbrella review of meta-analyses on the risk factors, protective factors, consequences and interventions of cyberbullying victimization. Nature Human Behaviour.',
    href: 'https://doi.org/10.1038/s41562-024-02011-6',
  },
]
</script>

<template>
  <article class="method">
    <header class="lede">
      <span class="tag">Method and sources</span>
      <h1>How the model works, and where its numbers come from</h1>
      <p class="sub">
        This page documents the simulation behind the
        <button class="link" type="button" @click="navigate('model')">Model</button>
        tab so its results can be examined and reproduced rather than taken on trust. It describes
        the model loosely following the ODD protocol (Overview, Design concepts, Details), the
        recognised standard for reporting agent-based models, then lists the literature behind each
        parameter.
      </p>
      <p class="disclaimer" role="note">
        <strong>Illustrative, not validated.</strong> spreadlab is a planning and discussion aid,
        not a prediction. Its parameters are explored as sensitivity ranges drawn from adjacent
        literatures, not fitted to real-school data, so its numbers must not be read as forecasts
        about any real school, platform, or incident.
      </p>
    </header>

    <!-- PART 1: how the model works, structured on ODD but written to read. -->
    <section aria-labelledby="how-heading">
      <h2 id="how-heading">How the model works</h2>

      <div class="block">
        <h3>Purpose</h3>
        <p>
          The model asks one question: when a non-consensual deepfake starts spreading through a
          school year group, where does a limited education budget actually make a difference? It
          runs the same outbreak in the same simulated network under different education strategies,
          so the only thing that changes between scenarios is who gets educated.
        </p>
      </div>

      <div class="block">
        <h3>Entities, state variables, and scale</h3>
        <p>
          The world is one year group of students (120 by default). Each student is an agent with a
          fixed set of friends, a forwarding probability, and a state: not reached, reached
          (received the fake), or educated. One student is the origin who first posts the fake. Time
          advances in discrete forwarding rounds. There is no spatial geometry in the engine, the
          layout you see on the Model tab is computed in the browser purely for display.
        </p>
      </div>

      <div class="block">
        <h3>The friendship network</h3>
        <p>
          Friendships come from the Holme-Kim model of preferential attachment with triangle
          closure, a port of networkx’s
          <code>powerlaw_cluster_graph</code>. Each new student attaches to a few existing students,
          more often to already-popular ones (which produces hubs), and sometimes closes a triangle
          with a friend of a new friend (which produces the dense, clustered friend groups of a real
          year group). The port preserves the model’s structure, not networkx’s exact random stream.
        </p>
        <p class="cite">
          Holme &amp; Kim (2002), growing scale-free networks with tunable clustering.
        </p>
      </div>

      <div class="block">
        <h3>Process and scheduling: the spread</h3>
        <p>
          The fake spreads as an independent cascade. In round 0 the origin posts it. In each later
          round, every student who just received it gets one chance to forward to each friend who
          has not yet seen it; whether that forward happens is a single random draw against the
          student’s forwarding probability. The draw for each friendship is fixed up front and
          reused across every scenario, so all strategies are compared in the identical world (the
          same outbreak, the same luck) and the only difference is the intervention. The cascade
          runs until no new student is reached.
        </p>
        <p class="cite">
          Kempe, Kleinberg &amp; Tardos (2003), maximizing the spread of influence through a social
          network.
        </p>
      </div>

      <div class="block">
        <h3>Design concepts: the forwarding probability</h3>
        <p>
          A student’s chance of forwarding is an additive composite, not a single fixed number. A
          baseline propensity is raised by how novel or shocking the fake is and lowered by the year
          group’s ambient harm awareness, then clamped to a sane range. For a student the education
          program reached, that propensity is scaled down by the program’s effect (a strong but
          imperfect reduction, not a perfect wall, so an educated student forwards less but not
          never). Education therefore needs no special case in the spread itself: it simply lowers a
          student’s forwarding chance.
        </p>
      </div>

      <div class="block">
        <h3>Design concepts: the education lever and the three strategies</h3>
        <p>
          The program reaches a fixed number of students (30% by default). Which students it reaches
          is the lever this tool exists to make visible. Three strategies are compared on the
          identical budget:
        </p>
        <ul class="strategies">
          <li><strong>No program:</strong> nobody is educated, the baseline outbreak.</li>
          <li><strong>Educate at random:</strong> the program reaches a uniform random share.</li>
          <li>
            <strong>Educate the most-connected:</strong> the program reaches the students with the
            most friends, the hubs whose forwarding keeps the network connected.
          </li>
        </ul>
        <p>
          Under the tuned default world the fake reaches roughly 83% of the year group with no
          program, 69% educating at random, and 18% educating the most-connected. Same budget, very
          different outcomes: who you teach matters more than how many.
        </p>
      </div>

      <div class="block">
        <h3>Design concepts: determinism</h3>
        <p>
          Every source of randomness (the network, the per-friendship draws, the random education
          pick) flows from seeds in the configuration. Identical settings reproduce identical
          results on any machine, which is what lets a shared link recreate the exact same picture
          and lets the project’s tests pin reach values. Nothing is left to the wall clock.
        </p>
      </div>

      <div class="block">
        <h3>Details: parameters as sensitivity ranges, not fitted values</h3>
        <p>
          Because direct empirical data on adolescent sexualized deepfake diffusion are still
          scarce, the model does not bake in point estimates. The curated levers (baseline
          forwarding, novelty, harm awareness, program effect) are explored as low / medium / high
          ranges drawn from adjacent open-access literatures on misinformation spread, complex
          contagion, peer aggression, cyberbullying interventions, and comprehensive sexuality
          education. The remaining literature parameters are documented and reserved for the
          calibrated instrument the grant would fund. The list below maps each parameter to its
          sources.
        </p>
      </div>
    </section>

    <!-- PART 2: the per-parameter source map. -->
    <section aria-labelledby="sources-heading">
      <h2 id="sources-heading">Sources behind each parameter</h2>
      <p class="sub">
        Drawn from the project team’s review of open-access literature. Each parameter is mapped to
        the source(s) it is grounded in. Live parameters are controls in the demo today; reserved
        parameters are documented in the model and wired into the funded, calibrated instrument.
      </p>

      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">Parameter</th>
              <th scope="col">In the model</th>
              <th scope="col">What it does</th>
              <th scope="col">Grounded in</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="param in parameterSources" :key="param.name">
              <th scope="row">{{ param.name }}</th>
              <td>
                <span class="status" :class="param.status">
                  {{ param.status === 'live' ? 'Live control' : 'Reserved' }}
                </span>
              </td>
              <td>{{ param.role }}</td>
              <td>
                <ul class="src-list">
                  <li v-for="source in param.sources" :key="source">{{ source }}</li>
                </ul>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- The full open-access reference list. -->
    <section aria-labelledby="refs-heading">
      <h2 id="refs-heading">References</h2>
      <p class="sub">
        Network and spread mechanics: Holme &amp; Kim (2002),
        <a href="https://doi.org/10.1103/PhysRevE.65.026107" target="_blank" rel="noopener"
          >growing scale-free networks with tunable clustering</a
        >; Kempe, Kleinberg &amp; Tardos (2003),
        <a href="https://doi.org/10.1145/956750.956769" target="_blank" rel="noopener"
          >maximizing the spread of influence through a social network</a
        >.
      </p>
      <p class="sub">Parameter sources, from the project team’s open-access literature review:</p>
      <ol class="refs">
        <li v-for="ref in references" :key="ref.code">
          <span class="refcode">{{ ref.code }}</span>
          <span class="reftext">
            {{ ref.text }}
            <a :href="ref.href" target="_blank" rel="noopener">open access</a>
          </span>
        </li>
      </ol>
    </section>

    <p class="closing">
      The full instrument the grant would fund replaces these illustrative ranges with values
      calibrated to real-school data, adds complex-contagion and per-agent heterogeneity, and
      searches for the best intervention under a budget. This demo is the accessible,
      intuition-building layer beneath it.
    </p>
  </article>
</template>

<style scoped>
.method {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  max-width: 820px;
  margin: 0 auto;
  padding: 8px 2px 56px;
}

.lede {
  margin-bottom: 28px;
}

.tag {
  display: inline-block;
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--edu);
  background: color-mix(in srgb, var(--edu) 12%, transparent);
  border-radius: 999px;
  padding: 4px 12px;
}

h1 {
  margin-top: 14px;
  font-size: 30px;
  font-weight: 700;
  line-height: 1.18;
  letter-spacing: -0.022em;
  color: var(--ink);
}

h2 {
  margin-top: 40px;
  margin-bottom: 6px;
  font-size: 21px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--ink);
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
}

h3 {
  font-size: 15.5px;
  font-weight: 650;
  color: var(--ink);
}

.block {
  margin-top: 20px;
}

.block h3 {
  margin-bottom: 4px;
}

.sub {
  margin-top: 12px;
  font-size: 15.5px;
  line-height: 1.6;
  color: var(--ink-2);
}

p {
  margin-top: 8px;
  font-size: 15px;
  line-height: 1.62;
  color: var(--ink-2);
}

code {
  font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
  font-size: 0.88em;
  background: var(--bg);
  border: 1px solid var(--border-soft);
  border-radius: 6px;
  padding: 1px 5px;
}

.cite {
  margin-top: 6px;
  font-size: 13px;
  color: var(--ink-3);
}

.disclaimer {
  margin-top: 18px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--ink-2);
  background: var(--spread-soft);
  border: 1px solid color-mix(in srgb, var(--spread) 28%, transparent);
  border-radius: 12px;
  padding: 12px 16px;
}

.disclaimer strong {
  color: var(--ink);
}

.strategies {
  margin: 10px 0 0;
  padding-left: 20px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.strategies li {
  font-size: 15px;
  line-height: 1.55;
  color: var(--ink-2);
}

.strategies strong,
.block strong {
  color: var(--ink);
  font-weight: 600;
}

.table-scroll {
  margin-top: 16px;
  overflow-x: auto;
  border: 1px solid var(--border);
  border-radius: 14px;
}

table {
  border-collapse: collapse;
  width: 100%;
  min-width: 640px;
  font-size: 13.5px;
}

thead th {
  position: sticky;
  top: 0;
  text-align: left;
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--ink-3);
  background: var(--surface);
  padding: 11px 14px;
  border-bottom: 1px solid var(--border);
}

tbody tr {
  border-bottom: 1px solid var(--border-soft);
}

tbody tr:last-child {
  border-bottom: none;
}

tbody th {
  text-align: left;
  vertical-align: top;
  font-weight: 600;
  color: var(--ink);
  padding: 12px 14px;
  white-space: nowrap;
}

tbody td {
  vertical-align: top;
  padding: 12px 14px;
  color: var(--ink-2);
  line-height: 1.5;
}

.status {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
  border-radius: 999px;
  padding: 2px 9px;
  white-space: nowrap;
}

.status.live {
  color: var(--edu);
  background: var(--edu-soft);
  border: 1px solid color-mix(in srgb, var(--edu) 35%, transparent);
}

.status.reserved {
  color: var(--ink-3);
  background: var(--bg);
  border: 1px solid var(--border);
}

.src-list {
  margin: 0;
  padding-left: 16px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.src-list li {
  font-size: 12.5px;
  line-height: 1.45;
  color: var(--ink-3);
}

.refs {
  margin: 14px 0 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.refs li {
  display: flex;
  gap: 12px;
  font-size: 13.5px;
  line-height: 1.5;
  color: var(--ink-2);
}

.refcode {
  flex: none;
  width: 30px;
  font-weight: 700;
  color: var(--ink-3);
  font-variant-numeric: tabular-nums;
}

.reftext {
  min-width: 0;
}

a {
  color: var(--edu);
  font-weight: 550;
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
  text-underline-offset: 2px;
}

.closing {
  margin-top: 36px;
  padding-top: 18px;
  border-top: 1px solid var(--border);
  font-size: 14px;
  color: var(--ink-3);
}

.link {
  font: inherit;
  color: var(--edu);
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}

@media (max-width: 760px) {
  h1 {
    font-size: 23px;
  }

  h2 {
    font-size: 19px;
    margin-top: 32px;
  }

  .method {
    padding: 4px 0 48px;
  }
}
</style>
