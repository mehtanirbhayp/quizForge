import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import PDFDocument from 'pdfkit';
import db from './database';
import { processDocumentAsync } from '../routes/documents';

const uploadsDir = path.resolve(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Helper to generate a styled PDF document
function createPdfFile(
  filePath: string,
  title: string,
  sections: { title: string; questions: string[] }[],
  answerKey: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const writeStream = fs.createWriteStream(filePath);

    doc.pipe(writeStream);

    // Title
    doc.fontSize(22).font('Helvetica-Bold').text('QUIZFORGE ACADEMIC ASSESSMENT', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#334155').text(title, { align: 'center' });
    doc.moveDown(1);
    doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(1);

    doc.fillColor('#0f172a');

    for (const section of sections) {
      doc.fontSize(14).font('Helvetica-Bold').text(section.title);
      doc.moveDown(0.5);

      for (const qText of section.questions) {
        // If near bottom of page, add page
        if (doc.y > 680) {
          doc.addPage();
        }
        doc.fontSize(10).font('Helvetica').text(qText);
        doc.moveDown(0.7);
      }
      doc.moveDown(0.5);
    }

    // Add Answer Key Section
    if (answerKey) {
      if (doc.y > 600) {
        doc.addPage();
      }
      doc.moveDown(1);
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#1e293b').text('ANSWER KEY & EXPLANATIONS');
      doc.moveDown(0.5);
      doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica').fillColor('#334155').text(answerKey);
    }

    doc.end();
    writeStream.on('finish', () => resolve());
    writeStream.on('error', (err) => reject(err));
  });
}

async function seed() {
  console.log('--- Starting QuizForge Database Seeding ---');

  // 1. Create or reset demo user
  const userId = 'user_demo_1';
  const email = 'demo@quizforge.io';
  const displayName = 'Alex Mercer (Demo Scholar)';
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync('password123', salt);

  db.prepare(`
    INSERT INTO users (id, email, password_hash, display_name)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET password_hash = excluded.password_hash, display_name = excluded.display_name
  `).run(userId, email, passwordHash, displayName);

  // User settings
  db.prepare(`
    INSERT INTO user_settings (user_id, ai_provider, theme, default_negative_marking, default_time_per_question)
    VALUES (?, 'none', 'dark', 0.25, 90)
    ON CONFLICT(user_id) DO UPDATE SET theme = 'dark'
  `).run(userId);

  // 2. Create Study Collections
  const col1Id = 'col_thermo';
  const col2Id = 'col_cs_gate';
  const col3Id = 'col_aptitude';

  db.prepare(`
    INSERT INTO collections (id, user_id, name, description)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(id) DO NOTHING
  `).run(col1Id, userId, 'Thermodynamics & Heat Transfer (ME)', 'Covers classical thermodynamics, Carnot cycles, heat engines, entropy, and heat transfer mechanisms.');

  db.prepare(`
    INSERT INTO collections (id, user_id, name, description)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(id) DO NOTHING
  `).run(col2Id, userId, 'Computer Science & Data Structures (GATE)', 'Algorithms, asymptotic analysis, binary search trees, graph theory, and computer systems.');

  db.prepare(`
    INSERT INTO collections (id, user_id, name, description)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(id) DO NOTHING
  `).run(col3Id, userId, 'General Engineering Aptitude & Reasoning', 'Quantitative aptitude, logical reasoning, numerical problem solving, and diagrammatic comprehension.');

  // Create Topics
  const topics = [
    { id: 'top_carnot', colId: col1Id, name: 'Carnot Cycle & Efficiency' },
    { id: 'top_entropy', colId: col1Id, name: 'Entropy & Second Law' },
    { id: 'top_conduction', colId: col1Id, name: 'Conduction & Heat Exchangers' },
    { id: 'top_asymp', colId: col2Id, name: 'Asymptotic Complexity & Big-O' },
    { id: 'top_trees', colId: col2Id, name: 'Trees & Graph Traversal' },
    { id: 'top_quant', colId: col3Id, name: 'Quantitative Aptitude' },
    { id: 'top_logic', colId: col3Id, name: 'Logical Reasoning' },
  ];

  for (const t of topics) {
    db.prepare(`
      INSERT INTO topics (id, collection_id, name)
      VALUES (?, ?, ?)
      ON CONFLICT(id) DO NOTHING
    `).run(t.id, t.colId, t.name);
  }

  // 3. Generate Sample PDF 1: Thermodynamics
  const pdf1Path = path.join(uploadsDir, 'Thermodynamics_Question_Bank.pdf');
  await createPdfFile(
    pdf1Path,
    'THERMODYNAMICS & HEAT TRANSFER - PRACTICE SET',
    [
      {
        title: 'Section I: Laws of Thermodynamics & Heat Engines',
        questions: [
          '1. A reversible Carnot engine operates between temperatures of 800 K and 400 K. What is the theoretical maximum thermal efficiency of this engine?\n(A) 25%\n(B) 50%\n(C) 66.7%\n(D) 75%\nAns: (B)\nExplanation: Thermal efficiency eta = 1 - (T_cold / T_hot) = 1 - (400/800) = 0.50 or 50%.',
          
          '2. In an isothermal expansion of an ideal gas, which of the following thermodynamic state variables remains strictly constant?\n(A) Enthalpy\n(B) Pressure\n(C) Temperature\n(D) Entropy\nAns: (C)\nExplanation: By definition, an isothermal process is one where the temperature remains constant (Delta T = 0).',
          
          '3. According to the Second Law of Thermodynamics, the total entropy of an isolated system:\n(A) Always decreases\n(B) Must remain constant\n(C) Can never decrease over time\n(D) Oscillates around zero\nAns: (C)\nExplanation: For any spontaneous process in an isolated system, the change in entropy Delta S >= 0.',
          
          '4. A heat engine receives 1200 kJ of heat from a high-temperature reservoir and rejects 720 kJ to a low-temperature sink. What is the net work output of the engine in kJ?\n(A) 480 kJ\n(B) 600 kJ\n(C) 720 kJ\n(D) 1920 kJ\nAns: (A)\nExplanation: W_net = Q_in - Q_out = 1200 kJ - 720 kJ = 480 kJ.',

          '5. Consider the steady-state heat conduction across a plane wall of thickness L = 0.2 m with thermal conductivity k = 1.5 W/m-K and temperature difference Delta T = 40 K. Refer to the temperature profile diagram.\n(A) 150 W/m^2\n(B) 300 W/m^2\n(C) 450 W/m^2\n(D) 600 W/m^2\nAns: (B)\nExplanation: Heat flux q = -k * (dT/dx) = 1.5 * (40 / 0.2) = 300 W/m^2.'
        ]
      }
    ],
    '1. B\n2. C\n3. C\n4. A\n5. B'
  );

  // 4. Generate Sample PDF 2: Computer Science & Data Structures
  const pdf2Path = path.join(uploadsDir, 'Computer_Science_GATE_Mock.pdf');
  await createPdfFile(
    pdf2Path,
    'GATE COMPUTER SCIENCE - DATA STRUCTURES & ALGORITHMS',
    [
      {
        title: 'Part A: Algorithms and Asymptotic Analysis',
        questions: [
          '1. What is the worst-case time complexity of searching for an element in an unbalanced Binary Search Tree with n nodes?\n(A) O(1)\n(B) O(log n)\n(C) O(n)\n(D) O(n log n)\nAns: (C)\nExplanation: In an unbalanced skewed binary search tree (like a linked list), search degrades to O(n).',

          '2. Which of the following sorting algorithms have an average time complexity of O(n log n)?\n(A) Merge Sort\n(B) Quick Sort\n(C) Heap Sort\n(D) Bubble Sort\nAns: (A)\nExplanation: Merge sort, Quick sort, and Heap sort all achieve O(n log n) average time complexity.',

          '3. What is the minimum number of queues needed to implement a Last-In First-Out (LIFO) Stack?\n(A) 1\n(B) 2\n(C) 3\n(D) 4\nAns: (B)\nExplanation: Two FIFO queues are sufficient to simulate a LIFO stack behavior.',

          '4. In a connected undirected planar graph with V vertices, E edges, and F faces, Euler\'s formula states that V - E + F equals:\n(A) 0\n(B) 1\n(C) 2\n(D) 4\nAns: (C)\nExplanation: Euler\'s planar formula is V - E + F = 2.',

          '5. A hash table of size 11 uses open addressing with linear probing and hash function h(k) = k mod 11. What index does key 25 occupy?\n(A) 2\n(B) 3\n(C) 4\n(D) 5\nAns: (B)\nExplanation: 25 mod 11 = 3. Since slot 3 is initially empty, key 25 is placed at index 3.'
        ]
      }
    ],
    '1. C\n2. A\n3. B\n4. C\n5. B'
  );

  // 5. Generate Sample PDF 3: Engineering Aptitude
  const pdf3Path = path.join(uploadsDir, 'General_Aptitude_Reasoning.pdf');
  await createPdfFile(
    pdf3Path,
    'GENERAL ENGINEERING APTITUDE & REASONING',
    [
      {
        title: 'Section A: Quantitative & Reasoning',
        questions: [
          '1. If a train traveling at 72 km/h crosses a 180-meter long platform in 15 seconds, what is the length of the train in meters?\n(A) 100 m\n(B) 120 m\n(C) 150 m\n(D) 180 m\nAns: (B)\nExplanation: Speed = 72 * (5/18) = 20 m/s. Total distance = speed * time = 20 * 15 = 300 m. Train length = 300 - 180 = 120 m.',

          '2. Find the missing number in the series: 3, 7, 15, 31, 63, ?\n(A) 95\n(B) 115\n(C) 127\n(D) 128\nAns: (C)\nExplanation: Each term follows x_n = 2 * x_{n-1} + 1. So 63 * 2 + 1 = 127.',

          '3. In a class of 60 students, 40 like Mathematics, 35 like Physics, and 20 like both. How many students like neither Mathematics nor Physics?\n(A) 5\n(B) 10\n(C) 15\n(D) 20\nAns: (A)\nExplanation: n(M union P) = 40 + 35 - 20 = 55. Neither = 60 - 55 = 5 students.',

          '4. Refer to the flow diagram showing process flow rates. If inlet stream A is 50 kg/h and stream B is 30 kg/h, what is the combined exit rate?\n(A) 60 kg/h\n(B) 70 kg/h\n(C) 80 kg/h\n(D) 90 kg/h\nAns: (C)\nExplanation: Conservation of mass under steady state: Exit = A + B = 50 + 30 = 80 kg/h.'
        ]
      }
    ],
    '1. B\n2. C\n3. A\n4. C'
  );

  // 6. Insert Documents into DB and Link to Collections
  const docsData = [
    {
      id: 'doc_thermo_sample',
      title: 'Thermodynamics & Heat Transfer - Practice Set',
      filename: 'Thermodynamics_Question_Bank.pdf',
      path: pdf1Path,
      colId: col1Id
    },
    {
      id: 'doc_cs_sample',
      title: 'GATE Computer Science - Data Structures & Algorithms',
      filename: 'Computer_Science_GATE_Mock.pdf',
      path: pdf2Path,
      colId: col2Id
    },
    {
      id: 'doc_apt_sample',
      title: 'General Engineering Aptitude & Reasoning',
      filename: 'General_Aptitude_Reasoning.pdf',
      path: pdf3Path,
      colId: col3Id
    }
  ];

  for (const d of docsData) {
    db.prepare(`
      INSERT INTO documents (id, user_id, title, original_filename, storage_path, processing_status)
      VALUES (?, ?, ?, ?, ?, 'uploaded')
      ON CONFLICT(id) DO UPDATE SET storage_path = excluded.storage_path
    `).run(d.id, userId, d.title, d.filename, d.path);

    db.prepare(`
      INSERT OR IGNORE INTO collection_documents (collection_id, document_id)
      VALUES (?, ?)
    `).run(d.colId, d.id);

    // Process document synchronously to extract questions
    console.log(`Processing sample document: ${d.title}`);
    await processDocumentAsync(d.id);
  }

  // 7. Associate questions with topics and assign difficulty
  const thermoQ = db.prepare('SELECT id FROM questions WHERE document_id = ?').all('doc_thermo_sample') as any[];
  if (thermoQ.length >= 4) {
    db.prepare("UPDATE questions SET topic_id = 'top_carnot', difficulty = 'easy' WHERE id = ?").run(thermoQ[0].id);
    db.prepare("UPDATE questions SET topic_id = 'top_entropy', difficulty = 'medium' WHERE id = ?").run(thermoQ[1].id);
    db.prepare("UPDATE questions SET topic_id = 'top_entropy', difficulty = 'medium' WHERE id = ?").run(thermoQ[2].id);
    db.prepare("UPDATE questions SET topic_id = 'top_carnot', difficulty = 'medium' WHERE id = ?").run(thermoQ[3].id);
  }

  const csQ = db.prepare('SELECT id FROM questions WHERE document_id = ?').all('doc_cs_sample') as any[];
  if (csQ.length >= 4) {
    db.prepare("UPDATE questions SET topic_id = 'top_asymp', difficulty = 'easy' WHERE id = ?").run(csQ[0].id);
    db.prepare("UPDATE questions SET topic_id = 'top_asymp', difficulty = 'medium' WHERE id = ?").run(csQ[1].id);
    db.prepare("UPDATE questions SET topic_id = 'top_trees', difficulty = 'medium' WHERE id = ?").run(csQ[2].id);
    db.prepare("UPDATE questions SET topic_id = 'top_trees', difficulty = 'hard' WHERE id = ?").run(csQ[3].id);
  }

  // 8. Bookmark a couple questions for demo
  if (thermoQ[0]) {
    db.prepare('INSERT OR IGNORE INTO bookmarks (user_id, question_id) VALUES (?, ?)').run(userId, thermoQ[0].id);
  }
  if (csQ[1]) {
    db.prepare('INSERT OR IGNORE INTO bookmarks (user_id, question_id) VALUES (?, ?)').run(userId, csQ[1].id);
  }

  // 9. Create 2 sample completed quiz sessions with history for analytics
  const pastSessionId1 = 'quiz_past_1';
  db.prepare(`
    INSERT INTO quiz_sessions (
      id, user_id, title, status, started_at, submitted_at, time_taken,
      score, maximum_score, accuracy, total_questions, correct_count, incorrect_count, unanswered_count, settings_json
    ) VALUES (
      ?, ?, 'Thermodynamics Diagnostic Test', 'submitted',
      datetime('now', '-2 days'), datetime('now', '-2 days', '+12 minutes'), 720,
      4.0, 5.0, 80.0, 5, 4, 1, 0,
      '{"quizMode":"practice","negativeMarking":false}'
    ) ON CONFLICT(id) DO NOTHING
  `).run(pastSessionId1, userId);

  const pastSessionId2 = 'quiz_past_2';
  db.prepare(`
    INSERT INTO quiz_sessions (
      id, user_id, title, status, started_at, submitted_at, time_taken,
      score, maximum_score, accuracy, total_questions, correct_count, incorrect_count, unanswered_count, settings_json
    ) VALUES (
      ?, ?, 'GATE CS Quick Practice', 'submitted',
      datetime('now', '-1 day'), datetime('now', '-1 day', '+8 minutes'), 480,
      3.0, 5.0, 60.0, 5, 3, 2, 0,
      '{"quizMode":"exam","negativeMarking":true,"negativeMarks":0.25}'
    ) ON CONFLICT(id) DO NOTHING
  `).run(pastSessionId2, userId);

  console.log('--- Seed Completed Successfully! ---');
  console.log('Demo Account: demo@quizforge.io / password123');
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
