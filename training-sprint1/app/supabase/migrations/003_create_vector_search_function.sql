-- ベクトル類似度検索関数
-- チャット画面でのAI回答生成時に使用
create or replace function match_document_chunks(
  query_embedding vector(1536),
  match_threshold float default 0.7,
  match_count int default 5,
  target_property_id uuid default null
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  page_number integer,
  page_image_path varchar,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    dc.id,
    dc.document_id,
    dc.content,
    dc.page_number,
    dc.page_image_path,
    1 - (dc.embedding <=> query_embedding) as similarity
  from document_chunks dc
  join documents d on dc.document_id = d.id
  where
    d.publish_status = 'published'
    and (target_property_id is null or d.property_id = target_property_id)
    and 1 - (dc.embedding <=> query_embedding) > match_threshold
  order by dc.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- テストプレビュー用（未公開ドキュメントも含む）
create or replace function match_document_chunks_preview(
  query_embedding vector(1536),
  match_threshold float default 0.7,
  match_count int default 5,
  target_property_id uuid default null
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  page_number integer,
  page_image_path varchar,
  publish_status varchar,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    dc.id,
    dc.document_id,
    dc.content,
    dc.page_number,
    dc.page_image_path,
    d.publish_status,
    1 - (dc.embedding <=> query_embedding) as similarity
  from document_chunks dc
  join documents d on dc.document_id = d.id
  where
    d.analysis_status = 'completed'
    and (target_property_id is null or d.property_id = target_property_id)
    and 1 - (dc.embedding <=> query_embedding) > match_threshold
  order by dc.embedding <=> query_embedding
  limit match_count;
end;
$$;
