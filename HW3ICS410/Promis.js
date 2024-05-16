
const posts = [
    { title: 'Post One', body: 'This is post one', author: 'John Doe', date: '2022-01-01' },
    { title: 'Post Two', body: 'This is post two', author: 'sam Doe', date: '2023-01-01' }

  ];
function getPosts() {
    setTimeout(() => {
        let output = '';
        posts.forEach((post , index) => {
            output += `<li>${post.title} by ${post.author} on ${post.date}: ${post.body}</li>`;
        });
        document.body.innerHTML = output;
    }, 1000);
}
function createPosts(post  ) {
    return new Promise((resolve , reject)=> {
        setTimeout(() => {
            posts.push(post);
            const error = false;
            if(!error)
            {
                resolve();
            }
            else {
                reject("Error: Something went Wrong")
            }
            
        }, 2000)
    });
    
}
createPosts({ title: 'Post three', body: 'This is post three', author: 'Jane Doe', date: '2022-02-01' } , )
.then(getPosts)
.catch(err => console.log(err));
async function init() { 
    await createPost({ title: 'Post three', body: 'This is post three', author: 'Jane Doe', date: '2022-02-01' });
    getPosts();

}

init();