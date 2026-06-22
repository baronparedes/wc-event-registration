require 'csv'
require 'fileutils'
require 'json'

BATCH_ID = '44444444-4444-4444-4444-444444444444'.freeze
INPUT_PATH = File.expand_path('../members_info.csv', __dir__)
OUTPUT_PATH = File.expand_path('../supabase/seeds/members.local.sql', __dir__)

HEADERS = [
  'RFID',
  'Role',
  'Category',
  'Surname',
  'Firstname',
  'Nickname',
  'SR_PWD',
  '1st Sunday',
  '2nd Sunday',
  '3rd Sunday',
  '4th Sunday',
  '5th Sunday',
  'IsOIC',
].freeze

def sql_literal(value)
  return 'null' if value.nil? || value.empty?

  "'#{value.gsub("'", "''")}'"
end

unless File.exist?(INPUT_PATH)
  warn "Missing source CSV: #{INPUT_PATH}"
  exit 1
end

rows = CSV.read(INPUT_PATH, headers: true)

FileUtils.mkdir_p(File.dirname(OUTPUT_PATH))

File.open(OUTPUT_PATH, 'w') do |file|
  file.puts '-- Local-only member seed generated from members_info.csv.'
  file.puts '-- This file is ignored by Git to keep member data out of source control.'
  file.puts 'begin;'
  file.puts
  file.puts "delete from public.import_errors where batch_id = '#{BATCH_ID}';"
  file.puts "delete from public.users_import_staging where batch_id = '#{BATCH_ID}';"
  file.puts
  file.puts 'insert into public.users_import_staging ('
  file.puts '  batch_id,'
  file.puts '  row_number,'
  file.puts '  rfid,'
  file.puts '  role,'
  file.puts '  category,'
  file.puts '  surname,'
  file.puts '  firstname,'
  file.puts '  nickname,'
  file.puts '  sr_pwd,'
  file.puts '  first_sunday,'
  file.puts '  second_sunday,'
  file.puts '  third_sunday,'
  file.puts '  fourth_sunday,'
  file.puts '  fifth_sunday,'
  file.puts '  is_oic,'
  file.puts '  raw_payload'
  file.puts ') values'

  rows.each_with_index do |row, index|
    fields = row.fields.take(HEADERS.length).map { |value| value&.strip }
    row_by_header = HEADERS.zip(fields).to_h

    payload = JSON.generate(
      row_by_header.reject { |_key, value| value.nil? || value.empty? },
    )

    values = [
      sql_literal(BATCH_ID),
      index + 1,
      sql_literal(row_by_header['RFID']),
      sql_literal(row_by_header['Role']),
      sql_literal(row_by_header['Category']),
      sql_literal(row_by_header['Surname']),
      sql_literal(row_by_header['Firstname']),
      sql_literal(row_by_header['Nickname']),
      sql_literal(row_by_header['SR_PWD']),
      sql_literal(row_by_header['1st Sunday']),
      sql_literal(row_by_header['2nd Sunday']),
      sql_literal(row_by_header['3rd Sunday']),
      sql_literal(row_by_header['4th Sunday']),
      sql_literal(row_by_header['5th Sunday']),
      sql_literal(row_by_header['IsOIC']),
      "#{sql_literal(payload)}::jsonb",
    ]

    suffix = index == rows.length - 1 ? ';' : ','
    file.puts "  (#{values.join(', ')})#{suffix}"
  end

  file.puts
  file.puts 'do $$'
  file.puts 'declare'
  file.puts '  import_result record;'
  file.puts 'begin'
  file.puts "  select * into import_result from public.process_members_import_batch('#{BATCH_ID}');"
  file.puts '  if import_result.error_rows > 0 then'
  file.puts "    raise exception 'Local member seed failed validation: % invalid row(s).', import_result.error_rows;"
  file.puts '  end if;'
  file.puts 'end;'
  file.puts '$$;'
  file.puts
  file.puts 'commit;'
end

puts "Generated #{OUTPUT_PATH} from #{INPUT_PATH} (#{rows.length} rows)."