const supabase = require('./supabase');

async function test() {
    console.log('Fetching transfers...');
    const { data: transfers, error } = await supabase
        .from('transfers')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Supabase error:', error);
        return;
    }
    
    console.log('Transfers count:', transfers.length);
    for (const t of transfers) {
        console.log(t.id, t.file_name);
    }
}
test();
