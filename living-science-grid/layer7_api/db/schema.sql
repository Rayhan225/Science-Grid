-- PostgreSQL schema for ScholarGrid
-- Creates extensions, tables, and indexes for Layer 7

-- NOTE: Running this file requires a role with permission to create extensions.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT,
    role VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Research projects
CREATE TABLE IF NOT EXISTS research_projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(255),
    description TEXT,
    status VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Manuscripts
CREATE TABLE IF NOT EXISTS manuscripts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES research_projects(id) ON DELETE CASCADE,
    title VARCHAR(500),
    file_name VARCHAR(255),
    file_path TEXT,
    version INTEGER DEFAULT 1,
    content_hash VARCHAR(128),
    is_blind BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Formulas
CREATE TABLE IF NOT EXISTS formulas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    manuscript_id UUID REFERENCES manuscripts(id) ON DELETE CASCADE,
    name VARCHAR(255),
    expression TEXT NOT NULL,
    description TEXT,
    variables JSONB,
    is_validated BOOLEAN DEFAULT FALSE,
    validation_result JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- API Nodes
CREATE TABLE IF NOT EXISTS api_nodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    formula_id UUID REFERENCES formulas(id) ON DELETE SET NULL,
    owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(255),
    slug VARCHAR(255) UNIQUE,
    endpoint_path VARCHAR(500) UNIQUE,
    http_method VARCHAR(20) DEFAULT 'POST',
    status VARCHAR(50),
    execution_count INTEGER DEFAULT 0,
    last_executed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- API Executions
CREATE TABLE IF NOT EXISTS api_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    api_node_id UUID REFERENCES api_nodes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    input_data JSONB,
    output_data JSONB,
    status VARCHAR(50),
    execution_time_ms INTEGER,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Git repositories
CREATE TABLE IF NOT EXISTS git_repositories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES research_projects(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    provider VARCHAR(50),
    repository_url TEXT,
    repository_name VARCHAR(255),
    default_branch VARCHAR(255),
    access_token_encrypted TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Code links
CREATE TABLE IF NOT EXISTS code_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository_id UUID REFERENCES git_repositories(id) ON DELETE CASCADE,
    manuscript_id UUID REFERENCES manuscripts(id) ON DELETE CASCADE,
    file_path TEXT,
    start_line INTEGER,
    end_line INTEGER,
    commit_hash VARCHAR(255),
    target_type VARCHAR(50),
    target_reference TEXT,
    description TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Manuscript versions
CREATE TABLE IF NOT EXISTS manuscript_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    manuscript_id UUID REFERENCES manuscripts(id) ON DELETE CASCADE,
    version_number INTEGER,
    file_path TEXT,
    content_hash VARCHAR(128),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (manuscript_id, version_number)
);

-- Manuscript diffs
CREATE TABLE IF NOT EXISTS manuscript_diffs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    manuscript_id UUID REFERENCES manuscripts(id) ON DELETE CASCADE,
    old_version_id UUID REFERENCES manuscript_versions(id) ON DELETE SET NULL,
    new_version_id UUID REFERENCES manuscript_versions(id) ON DELETE SET NULL,
    additions INTEGER,
    deletions INTEGER,
    modifications INTEGER,
    structural_changes JSONB,
    blind_mode BOOLEAN DEFAULT TRUE,
    diff_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- References (bibliography)
CREATE TABLE IF NOT EXISTS references (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    manuscript_id UUID REFERENCES manuscripts(id) ON DELETE CASCADE,
    citation_key VARCHAR(255),
    title TEXT,
    authors TEXT,
    year INTEGER,
    journal VARCHAR(500),
    doi VARCHAR(500),
    url TEXT,
    bibtex TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Citations found in manuscript
CREATE TABLE IF NOT EXISTS citations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    manuscript_id UUID REFERENCES manuscripts(id) ON DELETE CASCADE,
    citation_text TEXT,
    citation_key VARCHAR(255),
    location VARCHAR(255),
    line_number INTEGER,
    is_valid BOOLEAN DEFAULT FALSE,
    validation_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Citation validation reports
CREATE TABLE IF NOT EXISTS citation_validation_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    manuscript_id UUID REFERENCES manuscripts(id) ON DELETE CASCADE,
    total_citations INTEGER,
    valid_citations INTEGER,
    missing_references INTEGER,
    missing_doi INTEGER,
    format_errors INTEGER,
    score DECIMAL(5,2),
    report JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Publisher templates
CREATE TABLE IF NOT EXISTS publisher_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255),
    publisher VARCHAR(255),
    journal_name VARCHAR(255),
    page_width DECIMAL,
    page_height DECIMAL,
    margin_top DECIMAL,
    margin_bottom DECIMAL,
    margin_left DECIMAL,
    margin_right DECIMAL,
    font_name VARCHAR(255),
    font_size DECIMAL,
    max_words INTEGER,
    max_pages INTEGER,
    min_image_dpi INTEGER,
    columns INTEGER,
    rules JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Compliance checks
CREATE TABLE IF NOT EXISTS compliance_checks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    manuscript_id UUID REFERENCES manuscripts(id) ON DELETE CASCADE,
    template_id UUID REFERENCES publisher_templates(id) ON DELETE SET NULL,
    status VARCHAR(50),
    margin_check BOOLEAN,
    font_check BOOLEAN,
    image_dpi_check BOOLEAN,
    word_count_check BOOLEAN,
    page_count_check BOOLEAN,
    column_check BOOLEAN,
    score DECIMAL(5,2),
    report JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_research_projects_owner ON research_projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_manuscripts_project ON manuscripts(project_id);
CREATE INDEX IF NOT EXISTS idx_formulas_manuscript ON formulas(manuscript_id);
CREATE INDEX IF NOT EXISTS idx_api_nodes_slug ON api_nodes(slug);
CREATE INDEX IF NOT EXISTS idx_api_nodes_owner ON api_nodes(owner_id);
CREATE INDEX IF NOT EXISTS idx_api_executions_node ON api_executions(api_node_id);
CREATE INDEX IF NOT EXISTS idx_git_repos_project ON git_repositories(project_id);
CREATE INDEX IF NOT EXISTS idx_code_links_repo ON code_links(repository_id);
CREATE INDEX IF NOT EXISTS idx_code_links_manuscript ON code_links(manuscript_id);
CREATE INDEX IF NOT EXISTS idx_references_manuscript ON references(manuscript_id);
CREATE INDEX IF NOT EXISTS idx_references_key ON references(citation_key);
CREATE INDEX IF NOT EXISTS idx_citations_manuscript ON citations(manuscript_id);
CREATE INDEX IF NOT EXISTS idx_publisher_templates_journal ON publisher_templates(journal_name);
CREATE INDEX IF NOT EXISTS idx_compliance_checks_manuscript ON compliance_checks(manuscript_id);

-- End of schema
