import React from 'react';

export function Welcome() {
  return (
    <div className="welcome">
      <span className="welcome__eyebrow">Document QA · v1</span>
      <h1 className="welcome__head">From source documents to grounded Q&amp;A and audited TestCases.xlsx.</h1>
      <p className="welcome__lede">
        Drop your BRD, FRS, HLD and LLD pack into the composer below. The agent ingests the corpus into a
        local Postgres + pgvector knowledge base, then answers questions against it. Ask for
        <code>TestCases.xlsx</code> when you want source-aligned cases with an independent confidence and
        traceability audit.
      </p>
      <ol className="welcome__steps">
        <li>
          <span className="welcome__step-num">01</span>
          <div>
            <h3>Ingest</h3>
            <p>Hash, classify, parse and embed source documents into pgvector with entity + relationship maps.</p>
          </div>
        </li>
        <li>
          <span className="welcome__step-num">02</span>
          <div>
            <h3>Ask</h3>
            <p>Use the chat as a RAG interface over the ingested corpus, with cited source snippets.</p>
          </div>
        </li>
        <li>
          <span className="welcome__step-num">03</span>
          <div>
            <h3>Generate &amp; audit</h3>
            <p>Create TestCases.xlsx on request, then audit confidence and traceability before execution.</p>
          </div>
        </li>
      </ol>
    </div>
  );
}
