
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

function createPosts(post , callback) {
    setTimeout(() => {
        posts.push(post);
        callback();
    }, 2000)
}
getPosts();


createPosts({ title: 'Post three', body: 'This is post three', author: 'Jane Doe', date: '2022-02-01' } , getPosts);
  