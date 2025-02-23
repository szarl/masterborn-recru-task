-- Tabela dla statusów rekrutacji
CREATE TABLE RecruitmentStatus (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabela dla kandydatów
CREATE TABLE Candidate (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    years_of_experience INTEGER,
    consent_date DATETIME,
    current_status_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (current_status_id) REFERENCES RecruitmentStatus(id)
);

-- Tabela dla notatek rekrutera
CREATE TABLE RecruiterNote (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    candidate_id INTEGER NOT NULL,
    recruiter_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (candidate_id) REFERENCES Candidate(id),
    FOREIGN KEY (recruiter_id) REFERENCES Recruiter(id)
);

-- Tabela łącząca kandydatów z ofertami pracy (many-to-many)
CREATE TABLE CandidateJobOffer (
    candidate_id INTEGER NOT NULL,
    job_offer_id INTEGER NOT NULL,
    application_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (candidate_id, job_offer_id),
    FOREIGN KEY (candidate_id) REFERENCES Candidate(id),
    FOREIGN KEY (job_offer_id) REFERENCES JobOffer(id)
);

-- Wstępne dane dla statusów rekrutacji
INSERT INTO RecruitmentStatus (name, description) VALUES
    ('new', 'Nowy kandydat w systemie'),
    ('in_progress', 'W trakcie rozmów'),
    ('accepted', 'Zaakceptowany'),
    ('rejected', 'Odrzucony');